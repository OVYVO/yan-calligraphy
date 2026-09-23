# Step 05 — 多字图切分入库（M1）

> 对应大纲：`working-plan/base.md` 第 2.5 节第 1 项  
> 对应需求：`prd/multi-char-ingest.md`（全文；本阶段只做 **M1**）  
> 前置：Step 02 素材 CRUD / `/media/**` / sharp；Step 03 集字导出（用于透明 PNG 回归）  
> 与 Step 04 关系：互不阻塞；可先于或后于 Step 04 实施  

---

## 1. 目标与不做

### 目标

交付可日常使用的「多字入库」主路径：

- `/assets` 增加「多字入库」入口，进入 `/assets/split`
- 上传一张多字图，创建服务端会话（临时目录）
- **手动**矩形框选每个字，填写汉字，设置默认书体/来源/标签
- 服务端按框裁切 + 纸色阈值去底 → 透明 PNG；可预览（棋盘格）
- 确认入库：每框一条 `character_assets`，tags 含 `切分入库`
- 放弃会话清理临时文件；部分 commit 失败时保留已成功项

### 不做（留给 M2 / M3 或其他 step）

- 自动文字区域检测、OCR 建议汉字（PRD F-DET-*，M2）
- `batch_id` 数据库列与「按批筛选」（M2）
- 旋转框、去底强度滑杆、多图队列、前端通用抠图模型、rembg（M3）
- 不改集字编辑器功能（仅回归透明图导出）
- 不引入云端抠图 API

---

## 2. 本阶段约定

对齐 PRD 第 12 节已锁定决策（D1–D5）。

| 项 | 约定 |
| --- | --- |
| 路由 | `/assets/split` |
| 表结构 | **不改** `character_assets`；用 `tags` 约定区分来源 |
| 去底 | 服务端：裁切 → 亮度/纸色估计阈值 → 输出带 Alpha 的 PNG（sharp + 像素处理） |
| 标注 UI | **vue-konva**（`konva` + `vue-konva`）；坐标一律原图像素 |
| 会话 | 不落 SQLite；`uploads/_sessions/{sessionId}/` |
| 单文件上限 | 20MB；MIME：`image/jpeg` \| `image/png` \| `image/webp` |
| 最小框 | 短边 ≥ 24px；框必须落在图像范围内 |
| 校验 | zod，汉字规则复用 `shared/schemas/asset.ts` 的单字校验 |
| 缩略图 | 对入库 PNG 生成 JPEG thumbs（可 `flatten` 白底），与现网 `saveAssetImage` 策略一致 |
| UI | Naive UI；中文文案 |
| 包管理 | pnpm 安装依赖；版本写入后若 major 变化回写 `base.md` |

标签约定：

| 标签 | 何时写入 |
| --- | --- |
| `切分入库` | 凡本路径 commit 成功的素材 |
| `未去底` | `matte: false`，或抠图失败后用户选择不透明入库 |

默认元数据建议值：`style: '其他'`，`source: '多字切分'`，`tags: ['切分入库']`（用户可改；服务端保证最终含 `切分入库`）。

---

## 3. 实施顺序

严格按序。每小节本地跑通再往下。

### 3.1 路径与媒体扩展

改 `server/utils/paths.ts`：

1. 增加 `sessionsDir = resolve(uploadsRoot, '_sessions')`，启动时 `mkdirSync`  
2. 扩展 `safeUploadPath`：允许首段为 `_sessions`（以及现有 `originals` / `thumbs` / `exports`）  
3. 新增 `sessionDir(sessionId)` / `assertValidSessionId`（仅允许 UUID，防路径穿越）

改 `server/routes/media/[...path].get.ts`：随 `safeUploadPath` 自动支持读 `_sessions/...`；对会话文件可用较短缓存或不缓存（`Cache-Control: private, no-store` 亦可）。

验收：无法用 `..` 读出项目外文件；能读合法 `_sessions/{uuid}/source.jpg`。

### 3.2 共享 schema

新增 `shared/schemas/split.ts`（命名可微调）：

```ts
// 要点（实现时写完整 zod）
regionSchema: {
  id: string
  x, y, width, height: int ≥ 0
  char: 与 createAssetSchema.char 相同
  skip?: boolean
  matte?: boolean // default true
}
// width/height 短边校验可在 refine：min(width,height) >= 24
// 越界：相对 session 宽高在 API 层再校验

splitDefaultsSchema: 复用 style/source/tags/note（对齐 asset）

commitSplitSchema: { defaults, regions: regionSchema[] } // 至少 1 个未 skip
```

DTO 类型：`SplitSessionDto`、`SplitPreviewResponse`、`SplitCommitResponse`（对齐 PRD §6）。

### 3.3 会话与抠图工具

| 文件 | 职责 |
| --- | --- |
| `server/utils/split-session.ts` | 创建/读取/删除会话；写 `source` + `meta.json`；拼 `imageUrl` |
| `server/utils/matte.ts` | `extractRegionMatte(sourcePath, region, { matte })` → PNG Buffer |
| `server/utils/split-commit.ts` | 循环 regions：裁切去底 → 写 originals/thumbs → insert asset；汇总 succeeded/failed |

`matte.ts` 算法口径（M1 可调参，但先固定默认）：

1. `sharp(source).extract({ left: x, top: y, width, height })` 得到裁切图  
2. 若 `matte === false`：直接输出 PNG（不透明亦可）或 JPEG；入库 tags 加 `未去底`  
3. 若去底：转 raw RGBA/RGB，估计纸色（如四角采样中位亮度或近白像素均值）  
4. 按距离纸色的暗度生成 alpha（墨越深越不透明）；可对 alpha 做一次轻度腐蚀/闭运算，减少毛边（可选，非必须）  
5. 输出 PNG；失败抛错由上层捕获  

阈值偏保守：宁可多留一点浅灰底，也不要啃掉飞白笔画。

`split-commit.ts` 口径：

1. 生成 `batchId = randomUUID()`（仅响应返回，不入库）  
2. 对每个未 skip 的 region：独立 try/catch  
3. 成功：`character_assets` 插入（复用现有 insert 辅助函数若有；`image_path` 指向 `uploads/originals/{id}.png`）  
4. tags = `unique([...defaults.tags, '切分入库', ...(未去底?'未去底':[])])`  
5. 全部处理完后：若至少成功 1 条，删除会话目录；若全部失败，保留会话便于重试（或仍删——建议 **全部失败保留会话**）  
6. 返回 `{ batchId, succeeded, failed }`

### 3.4 Split API

```text
server/api/split/sessions/index.post.ts      # 创建
server/api/split/sessions/[id]/index.get.ts  # 元数据
server/api/split/sessions/[id]/index.delete.ts
server/api/split/sessions/[id]/preview.post.ts
server/api/split/sessions/[id]/commit.post.ts
```

| 接口 | 行为要点 |
| --- | --- |
| `POST /api/split/sessions` | multipart 字段名 `file`；校验大小与 MIME；写 `_sessions/{id}/source.{ext}` + `meta.json`；返回 `{ id, width, height, imageUrl, fileName }` |
| `GET /api/split/sessions/:id` | 读 meta；不存在 404 |
| `DELETE /api/split/sessions/:id` | `rm` 会话目录；幂等 |
| `POST .../preview` | body: 单 region（可不含 char）；返回预览图：可写 `_sessions/{id}/preview/{regionId}.png` 并返回 `previewUrl`，或直接二进制 PNG（二选一，全项目统一；推荐 URL 便于 `<img>`） |
| `POST .../commit` | zod 校验 → 逐框处理 → 部分成功仍 200 + failed 列表；无有效框 400 |

错误：`400` 中文 `message`；`404` 会话不存在；`500` 不回堆栈。

**本阶段不要实现** `detect`。

### 3.5 前端依赖与页面骨架

```bash
pnpm add konva vue-konva
```

注意：`ssr: false` 已锁定；`vue-konva` 仅在客户端组件中使用（页面或 `ClientOnly`）。

| 文件 | 职责 |
| --- | --- |
| `app/pages/assets/split.vue` | 工作台页：上传态 / 编辑态 |
| `app/composables/useSplitSession.ts` | 创建会话、regions 状态、选中、commit/discard |
| `app/components/split/SplitUploader.vue` | 选文件上传 |
| `app/components/split/SplitCanvas.vue` | vue-konva：图 + 框绘制/拖拽/缩放 |
| `app/components/split/SplitRegionList.vue` | 侧栏列表 + 汉字输入 + 跳过 |
| `app/components/split/SplitDefaultsForm.vue` | 默认书体/来源/标签 |
| `app/components/split/SplitPreviewPane.vue` | 棋盘格预览选中框 |

改 `app/pages/assets/index.vue`：在「上传」旁增加按钮「多字入库」→ `navigateTo('/assets/split')`。

布局建议：顶栏 + 左画布（约 2/3）+ 右侧栏（约 1/3）。

### 3.6 画布交互细则

`SplitCanvas.vue`：

1. 底图：`<v-image>` 加载 `/media/_sessions/...`；舞台可缩放（滚轮）与平移（空格+拖或中键，择一写清）  
2. 工具「添加框」：拖拽画出矩形，松手生成 region（临时 id），短边 < 24 则丢弃并 toast  
3. 选中：点击框；Transformer 调大小/拖动；坐标换算回**原图像素**再写回 state（注意 stage scale）  
4. Delete / Backspace：删除选中（输入框聚焦时不触发）  
5. 列表点击：选中对应框并把舞台平移到可见  

状态存在 composable，canvas 只负责同步几何。

### 3.7 预览与入库交互

1. 选中 region 且几何稳定后，可点「预览去底」→ `POST preview` → 右侧棋盘格显示  
2. 「确认入库」前校验：至少一个未 skip；每个未 skip 的 `char` 合法；框不越界  
3. commit 中：`NButton` loading 或进度文案「正在入库 n/m」  
4. 结束后：`NModal` 或 message 展示成功数/失败原因；成功则 `navigateTo('/assets?tag=切分入库')`（若现网 tag 筛选已支持；否则只跳 `/assets` 并 toast）  
5. 「放弃」：`DELETE` 会话并清空本地 state，回 `/assets`

### 3.8 透明 PNG 与集字回归

1. 用本路径入库 2–3 个透明字  
2. 在 `/compose/new` 选入这些字，导出 PNG  
3. 确认画布 `drawImage` 未把透明变成黑底（若现有 `flatten` 逻辑影响导出，仅修绘制/导出路径，不改素材文件）

若 thumbs 的 `flatten` 白底导致列表看着「不透明」是预期；**原图 PNG 必须保留 alpha**。

### 3.9 清理与边界

- 可选：启动时清理超过 24h 的 `_sessions/*`（简单扫目录 mtime 即可）  
- commit 写盘失败要删半成品 originals/thumbs（对齐现有 `saveAssetImage` 的 cleanup 思路）  

---

## 4. 完成后的关键文件

```text
prd/multi-char-ingest.md                    # 需求（已存在）
working-plan/base.md                        # 引用已指向 prd/

server/utils/paths.ts                       # + _sessions
server/utils/split-session.ts
server/utils/matte.ts
server/utils/split-commit.ts
server/api/split/sessions/index.post.ts
server/api/split/sessions/[id]/index.get.ts
server/api/split/sessions/[id]/index.delete.ts
server/api/split/sessions/[id]/preview.post.ts
server/api/split/sessions/[id]/commit.post.ts
server/routes/media/[...path].get.ts        # 随 paths 扩展

shared/schemas/split.ts

app/pages/assets/index.vue                  # + 入口按钮
app/pages/assets/split.vue
app/composables/useSplitSession.ts
app/components/split/SplitUploader.vue
app/components/split/SplitCanvas.vue
app/components/split/SplitRegionList.vue
app/components/split/SplitDefaultsForm.vue
app/components/split/SplitPreviewPane.vue

package.json                                # + konva, vue-konva
```

---

## 5. 完成标准

- [ ] `POST/GET/DELETE` 会话、`preview`、`commit` 可用；无 `detect` 接口  
- [ ] `/assets` →「多字入库」→ 上传 → 手动框 ≥3 字 → 填汉字 → 入库成功  
- [ ] 素材列表可见；按字搜得到；tags 含 `切分入库`；原图为透明 PNG  
- [ ] 预览棋盘格可见透明；「未去底」/跳过路径可用  
- [ ] 放弃会话不落库，临时目录删除  
- [ ] commit 部分失败时成功项仍在库中，失败有中文原因  
- [ ] 集字导出抽检透明字无黑底  
- [ ] `pnpm typecheck` 通过  
- [ ] 未做自动检测、未加 `batch_id` 列、未引入云 API / rembg / `@imgly/background-removal`

未满足以上任一项，不算 Step 05 / M1 完成。

---

## 6. 交给后续阶段

| 后续 | 内容 |
| --- | --- |
| M2（新 step） | `detect` API、连通域或模型自动框、OCR 建议字、`batch_id` 列与列表筛选 |
| M3（新 step） | 去底参数 UI、旋转框、多图队列、更强抠图模型 |
| Step 04（并行） | 集字间距/拖拽等，与本阶段无强依赖 |

实现中若调整 API 路径或去底默认参数，回写 `prd/multi-char-ingest.md`，重大范围变更先改 `base.md`。
