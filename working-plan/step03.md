# Step 03 — 集字选图、三种布局、导出 PNG

> 对应大纲：`working-plan/base.md` 第 2.2 集字相关验收、第 2.3 路由、第 3.4 `compositions`、第 3.5 作品 API、第 3.6 布局纯函数  
> 前置：Step 02 已完成（`character_assets`、素材 CRUD、`GET /api/assets/by-char/:char`、`/media/**`）  
> 本阶段完成 MVP 闭环的后半段：文案 → 选图 → 布局 → 保存 → 导出

---

## 1. 目标与不做

### 目标

集字工作台可用：

- `/compose/new` 输入文案与标题，自动拆字并为每个字尽量预选一张素材
- 缺字标红，不阻塞其他字排版与导出
- 点选某字后，右侧用 `by-char` 切换同字写法
- 支持三种布局：`vertical` / `horizontal` / `grid`，预览实时更新
- 作品可保存、打开继续编辑；列表在 `/compositions`
- 浏览器 Canvas **2x 导出 PNG**，预览与导出共用同一布局函数

### 不做

- 不做画布拖拽微调、字距/行距滑杆精细打磨（阶段 04；本阶段布局参数用合理默认值即可，允许简单数字输入）
- 不做宣纸纹理背景、对联/斗方专用模板
- 不做服务端 sharp 合成导出（大纲约定 MVP 用浏览器导出）
- 不重做素材上传与 CRUD；缺能力只补本阶段洞
- 不引入 Fabric.js

首页「最近作品」在本阶段接上真实数据。

---

## 2. 本阶段约定

| 项       | 约定                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| 表       | 新增 `compositions`，字段对齐大纲第 3.4 节                                                                 |
| API      | 大纲作品 CRUD 全部实现                                                                                     |
| 布局引擎 | 纯函数，放在 `shared/layout/`（前后端都可 import；MVP 主要在浏览器用）                                     |
| 画布     | 原生 Canvas 2D；预览 1x 显示，导出按 2x 离屏绘制                                                           |
| 拆字     | 去掉空白；标点与非汉字可跳过或占位，策略写死一种并在 UI 说明                                               |
| 默认选图 | 某字有素材时取 `by-char` 最新一条；无素材则 `assetId: null`，UI 标「缺字」                                 |
| 图片加载 | 画布绘制用 `/media/originals/...`（或 thumbs 预览、export 时换原图）；注意跨源：同源 `/media` 无 CORS 问题 |
| 校验     | zod，风格对齐 `shared/schemas/asset.ts`                                                                    |
| UI       | Naive UI；编辑器三栏：文案区 / 画布 / 候选区                                                               |

`layout_config` 默认值（可写死常量，阶段 04 再做成滑杆）：

```ts
{
  cellSize: 160,
  gap: 16,
  lineGap: 24,
  padding: 48,
  columns: 4,          // 仅 grid
  background: '#f7f3eb' // 浅宣纸色，纯色即可
}
```

`items` 单项形状：

```ts
{
  char: string;
  assetId: string | null;
  x: number;
  y: number;
  scale: number; // MVP 固定 1
  rotate: number; // MVP 固定 0
}
```

布局函数根据 `layout_type` + `layout_config` + 字符序列重算每个字的 `x/y`（及 `size`，可等于 `cellSize * scale`）。换布局或改间距时重算；换候选图只改 `assetId`，尽量保留位置。

---

## 3. 实施顺序

严格按序。每小节跑通再往下。

### 3.1 数据表与迁移

在 `server/database/schema.ts` **追加** `compositions`（保留已有 `characterAssets`）：

| 列                          | Drizzle 建议    | 约束                                                      |
| --------------------------- | --------------- | --------------------------------------------------------- |
| `id`                        | `text` PK       | `crypto.randomUUID()`                                     |
| `title`                     | `text` not null |                                                           |
| `text`                      | `text` not null | 原始文案                                                  |
| `layout_type`               | `text` not null | `vertical` \| `horizontal` \| `grid`                      |
| `layout_config`             | `text` not null | JSON 字符串                                               |
| `items`                     | `text` not null | JSON 字符串                                               |
| `export_path`               | `text`          | 可空；本阶段可始终为 null（导出走浏览器下载，不强制落盘） |
| `created_at` / `updated_at` | `text` not null | ISO                                                       |

```bash
pnpm db:generate
pnpm db:migrate
```

验收：库中同时存在 `character_assets` 与 `compositions`；素材功能不受影响。

### 3.2 共享类型与拆字 / 布局

新增（路径可微调，职责不要散）：

| 文件                             | 职责                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `shared/schemas/composition.ts`  | zod：`layoutType`、`layoutConfig`、`compositionItem`、创建/更新/列表 DTO          |
| `shared/layout/splitText.ts`     | 文案 → `string[]`（只要汉字；空白丢弃；标点丢弃）                                 |
| `shared/layout/computeLayout.ts` | `(chars, layoutType, config) => { width, height, items: { char, x, y, size }[] }` |
| `shared/layout/defaults.ts`      | 默认 `layout_config` 与三种 layout 枚举                                           |

三种布局算法（实现口径）：

| 类型         | 规则                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `vertical`   | 单列条幅：字自上而下；`y` 递增 `cellSize + lineGap`；`x` 固定为 `padding`。MVP 不做多列换列，简单可测 |
| `horizontal` | 字从左到右；满行（按画布最大宽或固定每行字数）换行；行距用 `lineGap`                                  |
| `grid`       | 按 `columns` 填格，行优先；格宽高为 `cellSize`，间距 `gap`                                            |

画布宽高由内容包围盒 + `padding` 算出，不要写死死板尺寸。

建议为 `computeLayout` 加最小单测（若项目尚无 vitest，可先手写 2 ～ 3 个断言函数在注释用例里，或本阶段末再加 `vitest`；**不阻塞主流程**）。

### 3.3 作品 API

对齐素材层写法，新增：

```text
server/utils/compositions.ts          # JSON 解析/序列化 + toCompositionDto
server/api/compositions/index.get.ts
server/api/compositions/index.post.ts
server/api/compositions/[id].get.ts
server/api/compositions/[id].patch.ts
server/api/compositions/[id].delete.ts
```

| 方法     | 路径                    | 行为                                                                                                                                                                              |
| -------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/api/compositions`     | 分页列表，按 `updated_at` 倒序；返回摘要（id、title、text、layoutType、updatedAt），不必带完整 items 大图                                                                         |
| `GET`    | `/api/compositions/:id` | 完整 DTO，含 `layoutConfig`、`items`                                                                                                                                              |
| `POST`   | `/api/compositions`     | body：`title`、`text`、`layoutType?`、`layoutConfig?`、`items?`；缺省时服务端可拆字并填默认布局与空选图，或要求前端算好再提交——**推荐前端算好再 POST**，服务端只做 zod 校验与落库 |
| `PATCH`  | `/api/compositions/:id` | 更新 title / text / layoutType / layoutConfig / items；刷新 `updated_at`                                                                                                          |
| `DELETE` | `/api/compositions/:id` | 本阶段可硬删除行（作品无软删要求）；不删素材文件                                                                                                                                  |

DTO 中 `items` 的 `assetId` 若非 null，详情接口**可附带**精简素材信息（`thumbUrl` / `imageUrl` / `char`），避免编辑器二次请求；也可以编辑器自行 `by-char` + 按 id 缓存。二选一，推荐详情附带已选 asset 摘要，减少闪烁。

错误约定与素材 API 一致：`400` / `404` / `500`，中文 `message`。

### 3.4 新建页 `/compose/new`

替换 `app/pages/compose/new.vue` 占位。

流程：

1. 表单：标题（默认可用文案前若干字）、文案 `NInput type="textarea"`
2. 点「开始集字」：
   - `splitText(text)`
   - 对每个字 `$fetch('/api/assets/by-char/' + encodeURIComponent(char))`，取第一条 id（可 `Promise.all`，注意同字缓存避免重复请求）
   - `computeLayout` 得到坐标
   - `POST /api/compositions`
   - `navigateTo('/compose/' + id)`
3. 文案为空或拆不出汉字时，禁止提交并提示

不要在 new 页做完整画布；编辑集中在 `[id]`。

### 3.5 编辑器 `/compose/:id`（核心）

替换 `app/pages/compose/[id].vue`。

三栏布局：

```text
┌──────────┬─────────────────────┬──────────────┐
│ 文案/布局 │  Canvas 预览        │ 当前字候选   │
│ 字序列   │                     │ by-char 网格 │
└──────────┴─────────────────────┴──────────────┘
顶栏：保存、导出 PNG、返回作品列表
```

#### 左栏

- 显示标题（可编辑）、只读或可改文案（若改正文：重新拆字；已有选图按字尽量保留，新字重新选）
- 布局切换：`NRadioGroup` 或 `NTabs` → `vertical` / `horizontal` / `grid`
- 字序列列表：每项显示汉字 + 是否缺字；点击切换「当前选中 index」

#### 中栏：`ComposeCanvas`

建议组件：`app/components/compose/ComposeCanvas.vue`

- props：`items`、`layoutConfig`、`assetsMap`（id → 图片 URL）、`selectedIndex`
- 用 `<canvas>`；`watch` 参数变化后 `draw()`
- 绘制顺序：背景色 → 每字图片（`drawImage` 进 `cellSize` 方框，contain 居中）→ 缺字画红框 + 汉字占位 → 选中字描边高亮
- 点击画布命中检测（按 items 的矩形）可改 `selectedIndex`

图片加载：用 `new Image()` + `img.src = asset.imageUrl`，`await decode` 或 `onload`；做简单内存缓存 Map，避免每次重绘都打请求。

#### 右栏：候选

- 当前选中字调用已有 `GET /api/assets/by-char/:char`
- 网格展示缩略图；点击后只更新该 index 的 `assetId`，触发重绘
- 无候选时显示「库中暂无此字」并链到 `/assets`

#### 保存与导出

- **保存**：`PATCH /api/compositions/:id`，body 含当前 title、text、layoutType、layoutConfig、items
- **导出**：离屏 canvas，宽高为逻辑尺寸 × 2；用同一 `draw` 逻辑（抽 `drawComposition(ctx, state, scale)`）；`canvas.toBlob('image/png')` 触发浏览器下载，文件名可用 `title + '.png'`
- 导出不要求写入 `uploads/exports/`（可选：成功后再 `PATCH export_path`，本阶段可跳过落盘）

换布局时：用当前字符序列 + 新 `layoutType` 重跑 `computeLayout`，写回 items 的 x/y，保留各字 `assetId`。

### 3.6 作品列表 `/compositions`

替换 `app/pages/compositions/index.vue`。

- 表格或卡片：标题、文案摘要、布局类型、更新时间
- 操作：打开编辑、删除（确认框）
- 空态引导「去新建集字」→ `/compose/new`
- 顶栏「新建」按钮

### 3.7 建议组件拆分

| 组件                                          | 职责                         |
| --------------------------------------------- | ---------------------------- |
| `app/components/compose/ComposeCanvas.vue`    | 预览绘制与点击选中           |
| `app/components/compose/CharSequenceList.vue` | 左侧字序列                   |
| `app/components/compose/CandidatePanel.vue`   | 右侧同字候选                 |
| `app/components/compose/LayoutTypePicker.vue` | 三种布局切换                 |
| `app/composables/useCompositionEditor.ts`     | 加载、选图、换布局、保存状态 |

Pinia 可选；单页编辑器用 composable 通常够用。

### 3.8 首页与导航

- `app/pages/index.vue`：「最近作品」改为请求 `/api/compositions`，展示标题列表，点进编辑器
- 确认 `layouts/default.vue` 中「新建集字」「作品」链接可用

### 3.9 类型检查与自测

```bash
pnpm typecheck
pnpm dev
```

准备库中至少有「春风又绿江南岸」里若干字的素材（缺字场景也要测）。走一遍第 5 节清单。

---

## 4. 完成后的关键文件

```text
server/database/schema.ts                 # + compositions
server/database/migrations/               # 新迁移
server/utils/compositions.ts
server/api/compositions/index.get.ts
server/api/compositions/index.post.ts
server/api/compositions/[id].get.ts
server/api/compositions/[id].patch.ts
server/api/compositions/[id].delete.ts
shared/schemas/composition.ts
shared/layout/splitText.ts
shared/layout/computeLayout.ts
shared/layout/defaults.ts
app/pages/compose/new.vue
app/pages/compose/[id].vue
app/pages/compositions/index.vue
app/components/compose/...
app/composables/useCompositionEditor.ts
```

---

## 5. 完成标准

- [ ] `compositions` 表已迁移；素材库功能回归正常
- [ ] 输入含汉字文案可创建作品并进入编辑器
- [ ] 有素材的字自动带图；无素材标红「缺字」，其余字仍可预览与导出
- [ ] 同字 ≥2 张时，右侧候选可切换，画布立即更新
- [ ] 竖排 / 横排 / 宫格切换后位置正确重排，已选图不丢
- [ ] 保存后刷新或重开 `/compose/:id`，标题、选图、布局一致
- [ ] 导出 PNG 清晰（2x），可用系统看图打开
- [ ] `/compositions` 可列表、打开、删除
- [ ] `pnpm typecheck` 通过
- [ ] 未引入 Fabric、未做拖拽微调与宣纸纹理（留给阶段 04）

未满足以上任一项，不算 MVP 闭环完成，也不进入阶段 04。

---

## 6. 交给下一阶段

阶段 04 将在本编辑器上打磨：

- 字距 / 行距 / 边距 / 宫格列数滑杆（改的就是 `layout_config`）
- 画布拖拽微调，写回 items 的 x/y 或偏移
- 简单背景选项、导出体验与作品管理细节

布局纯函数与 Canvas 绘制入口在本阶段就要抽干净，方便阶段 04 只加交互、不重写算法。
