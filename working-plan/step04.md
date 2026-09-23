# Step 04 — 集字打磨（间距 · 拖拽 · 背景 · 导出体验）

> 对应大纲：`working-plan/base.md` 第 2.2 布局验收（可调字距/行距/边距；宫格可调列数）、第 2.5 增强项中与编辑器相关的「简易背景」切片  
> 前置：Step 03 已完成（`compositions`、布局纯函数、Canvas 预览/2x 导出、作品 CRUD）  
> 本阶段只加交互与体验，**不重写** `computeLayout` / `drawComposition` 算法骨架  

---

## 1. 目标与不做

### 目标

日常集字更顺手：

- 编辑器内用滑杆调节：`cellSize`、`gap`、`lineGap`、`padding`；宫格/横排可调「列数 / 每行字数」（共用 `layoutConfig.columns`）
- 画布上拖拽单个字，写回该 item 的 `x` / `y`；保存后重开位置仍在
- 提供若干宣纸色背景预设 + 自定义颜色（仍写 `layoutConfig.background`）
- 改间距/布局类型时重新跑布局；提供「重置位置」一键回到当前布局计算结果
- 导出文件名更友好；作品列表信息略补全（字数等）
- 有未保存修改时离开页面前二次确认

### 不做

- 不做 Fabric.js、多选对齐、旋转把手（`rotate` 字段保持 0）
- 不做宣纸纹理位图、对联/斗方专用模板（大纲 2.5 其余项）
- 不做服务端 sharp 合成导出；仍浏览器 2x PNG 下载
- 不做多字切分入库（Step 05）
- 不改素材库 API / 表结构

---

## 2. 本阶段约定

| 项 | 约定 |
| --- | --- |
| 数据 | 继续用现有 `layout_config` / `items` JSON，**不加迁移** |
| 改间距 | 调用现有 `applyLayout`：重算全部 `x/y`，手动拖拽偏移丢弃（符合「改参数即重排」） |
| 拖拽 | 仅改被拖 item 的 `x/y`；`scale`/`rotate` 本阶段仍固定 1 / 0 |
| 画布尺寸 | `max(布局计算结果, 全部 item 包围盒 + padding)`，避免拖出后被裁切 |
| 横排换行 | `horizontal` 改为按 `layoutConfig.columns` 作为每行字数（默认 4，与宫格一致） |
| 背景 | 预设色板 + `NColorPicker`；值仍是 CSS 颜色字符串 |
| UI | Naive UI：`NSlider`、`NColorPicker`、`NButton`、`NPopconfirm` / `useDialog` |
| 脏检查 | 与上次成功 `save` / `load` 的快照比对；路由离开用 `onBeforeRouteLeave` |

滑杆建议范围（与 zod `layoutConfigSchema` 对齐）：

| 字段 | 最小 | 最大 | 步进 |
| --- | --- | --- | --- |
| `cellSize` | 40 | 320 | 4 |
| `gap` | 0 | 80 | 2 |
| `lineGap` | 0 | 80 | 2 |
| `padding` | 0 | 120 | 4 |
| `columns` | 1 | 12 | 1 |

背景预设（可微调色值，全项目统一常量）：

```ts
export const BACKGROUND_PRESETS = [
  { label: '浅宣', value: '#f7f3eb' },
  { label: '米黄', value: '#f3e6c8' },
  { label: '雪白', value: '#ffffff' },
  { label: '淡青', value: '#eef3ef' },
  { label: '墨底', value: '#2b2926' },
] as const
```

---

## 3. 实施顺序

严格按序。每小节跑通再往下。

### 3.1 布局微调：横排用 `columns`

改 `shared/layout/computeLayout.ts` 的 `horizontalLayout`：

- 用 `Math.max(1, config.columns)` 作为每行字数，不再写死 `Math.min(8, chars.length)`  
- 验收：`columns=4` 时 8 个字为 2 行；改 `gap`/`lineGap` 尺寸正确  

可选：在 `shared/layout/defaults.ts` 导出 `BACKGROUND_PRESETS`。

### 3.2 画布尺寸与包围盒

新增（或放进 `computeLayout.ts` / 新文件 `shared/layout/bounds.ts`）：

```ts
function compositionBounds(items, layoutConfig) => { width, height }
// width  = max(item.x + cellSize*scale) + padding
// height = max(item.y + cellSize*scale) + padding
// 再与 computeLayout(...).width/height 取 max，保证未拖拽时与原先一致
```

`ComposeCanvas` 的 `logicalSize`、编辑器里的 `canvasSize`、导出尺寸都改用该函数，**不要**只信 `computeLayout` 而忽略已拖拽的 `x/y`。

加载作品时：用保存的 `items` 算 bounds，不要强制重算布局覆盖坐标。

### 3.3 布局参数面板

新增 `app/components/compose/LayoutConfigPanel.vue`：

- `v-model` 绑定 `LayoutConfig`（或逐字段 emit `update:layoutConfig`）  
- 滑杆：字号(`cellSize`)、字距(`gap`)、行距(`lineGap`)、边距(`padding`)  
- `columns`：横排显示「每行字数」，宫格显示「列数」；竖排可隐藏或禁用  
- 背景：预设色块按钮 + `NColorPicker`  
- 「重置位置」按钮：emit `reset-positions`（父级调用 `applyLayout`）  

父级 `compose/[id].vue`：滑杆变更时 `debounce` 或立即调用 `updateLayoutConfig`（见 3.5），避免拖滑杆时每帧打爆。立即更新可接受（字数通常不多）。

### 3.4 画布拖拽

改 `app/components/compose/ComposeCanvas.vue`：

1. `pointerdown` 在 hitTest 命中字上：选中该字，开始拖拽  
2. `pointermove`：`dx/dy` 按 `displayScale` 反算为逻辑坐标，更新临时位置并通过 emit 通知父级（或 `v-model:items`）  
3. `pointerup` / `pointercancel`：结束拖拽  
4. 拖拽中 `cursor: grabbing`；避免与 click 选中冲突（移动超过阈值才算拖，或 down 即选中）  
5. **导出仍不画选中框**（已有 `selectedIndex: null`）  

约定 emit：

```ts
'update:selectedIndex': [index: number]
'update:item-position': [index: number, x: number, y: number]
```

父级 / composable 写回 `items[index].x/y`，并刷新 `canvasSize`。

### 3.5 编辑器 composable

改 `app/composables/useCompositionEditor.ts`：

| 方法 | 行为 |
| --- | --- |
| `updateLayoutConfig(partial)` | 合并 config → `applyLayout`（重算坐标） |
| `moveItem(index, x, y)` | 只改该 item 坐标；更新 `canvasSize` |
| `resetPositions()` | `applyLayout(layoutType, layoutConfig)` |
| `isDirty` | 与 `savedSnapshot` 深度比较 title/text/layoutType/layoutConfig/items 几何与选图 |
| `markSaved()` | save/load 成功后刷新快照 |

`load` 时：`canvasSize` 用 bounds(items)，保留服务端回来的 `x/y`。

### 3.6 编辑器页面组装

改 `app/pages/compose/[id].vue`：

- 侧栏或工具区挂上 `LayoutConfigPanel`（建议放在画布下方或右侧候选上方）  
- 接线：config 变更、拖拽、重置  
- `onBeforeRouteLeave`：若 `isDirty`，`dialog.warning` 确认  
- 导出文件名：`${title || '集字'}-${yyyyMMdd-HHmm}.png`  

### 3.7 作品列表小打磨

改 `app/pages/compositions/index.vue`：

- 增加「字数」列：对 `text` 用与 `splitText` 相同规则计数，或直接显示 `Array.from(text)` 过滤后长度（前端算即可，避免改 API）  
- 空态 / 表头文案保持中文清晰  

（可选，时间够再做）首页「最近作品」无需大改。

### 3.8 回归

- 竖排 / 横排 / 宫格切换 + 滑杆 → 预览与 2x 导出一致  
- 拖拽后保存 → 刷新页面位置保留  
- 再改字距 → 位置按新布局重算（拖拽丢失，符合约定）  
- 透明 PNG 素材（若有）导出不黑底  
- `pnpm typecheck` 通过  

---

## 4. 完成后的关键文件

```text
working-plan/step04.md
working-plan/base.md                         # 阶段 04 状态

shared/layout/defaults.ts                    # + BACKGROUND_PRESETS
shared/layout/computeLayout.ts               # horizontal 用 columns
shared/layout/bounds.ts                      # 新增：画布包围盒
shared/layout/drawComposition.ts             # 通常无需改

app/composables/useCompositionEditor.ts      # config/拖拽/脏检查
app/components/compose/LayoutConfigPanel.vue # 新增
app/components/compose/ComposeCanvas.vue      # 拖拽 + bounds
app/pages/compose/[id].vue                   # 组装 + 离开确认
app/pages/compositions/index.vue             # 字数列
```

---

## 5. 完成标准

- [ ] 滑杆可调字号/字距/行距/边距；宫格与横排可调列数（每行字数）；预览实时更新  
- [ ] 背景预设与自定义色生效，导出底色一致  
- [ ] 画布可拖拽单字；保存并刷新后坐标仍在  
- [ ] 「重置位置」恢复为当前 layoutConfig 下的计算结果  
- [ ] 改间距或布局类型会重排；与拖拽约定一致  
- [ ] 未保存离开有确认；导出文件名含标题与时间  
- [ ] 作品列表可见字数  
- [ ] `pnpm typecheck` 通过  
- [ ] 未引入 Fabric；未做纹理背景 / 多字切分  

未满足以上任一项，不算 Step 04 完成。

---

## 6. 交给下一阶段

- Step 05：多字图切分入库（`prd/multi-char-ingest.md`）  
- 更后：宣纸纹理、对联模板、画布多选对齐等可再开增强 step  
