# Step 02 — 素材库（入库 / 检索 / 编辑）

> 对应大纲：`working-plan/base.md` 第 2.2、2.3、3.4、3.5 节，以及第 4 节阶段 02  
> 前置：Step 01 已完成（Nuxt 空壳、`db`、健康检查、`uploads/` 目录）  
> 本阶段只做单字素材，不做集字、布局、导出

---

## 1. 目标与不做

### 目标

素材库可日常使用：

- 上传一张或多张单字照片，必填汉字，可选书体 / 来源 / 标签 / 备注  
- 原图进 `uploads/originals/`，列表只用 `uploads/thumbs/` 缩略图  
- `/assets` 网格浏览，按字精确搜索、按书体筛选  
- `/assets/:id` 看大图、改元数据、软删除  
- 重启后数据与图片仍在；同字多写法在列表或详情里能看出数量  

### 不做

- 不建 `compositions` 表，不做集字编辑器与导出（阶段 03）  
- 不做 OCR、自动抠字、去底、从文件名猜汉字（阶段 05）  
- 不做拖拽微调、宣纸背景、登录权限  
- 不改 Step 01 已定的 `ssr: false`、数据库路径、包管理约定  

首页可顺带显示「素材数量 / 最近上传」；「最近作品」仍可占位，等阶段 03。

---

## 2. 本阶段约定

| 项 | 约定 |
| --- | --- |
| 表 | 只加 `character_assets`，字段与大纲第 3.4 节一致 |
| API | 大纲第 3.5 节素材相关接口；本阶段实现除 `batch` 外的全部（`batch` 可后置） |
| 图片访问 | 只读 `GET /media/**`，禁止直接暴露可写目录 |
| 缩略图 | sharp，最长边约 400px，存 JPEG 或 WebP（二选一，全项目统一） |
| 校验 | zod；汉字必须恰好 1 个汉字字符 |
| 删除 | 软删除（写 `deleted_at`）；列表与检索默认排除已删记录 |
| 客户端状态 | 可用 Pinia 存列表筛选条件；也可页面本地 `ref`，二选一即可 |
| UI | Naive UI：`NUpload`、`NGrid`、`NInput`、`NSelect`、`NModal`、`NEmpty`、`NPagination` |

书体枚举（写入与筛选共用）：

```ts
const STYLES = ['楷', '行', '草', '隶', '篆', '其他'] as const
```

---

## 3. 实施顺序

严格按下列顺序做。每完成一小节，本地跑通再往下。

### 3.1 数据表与迁移

改 `server/database/schema.ts`，用 Drizzle sqlite 表定义 `character_assets`：

| 列 | Drizzle 建议 | 约束 |
| --- | --- | --- |
| `id` | `text` PK | 用 `crypto.randomUUID()` 生成 |
| `char` | `text` not null | 单字 |
| `image_path` | `text` not null | 相对项目根，如 `uploads/originals/{id}.jpg` |
| `thumb_path` | `text` not null | 如 `uploads/thumbs/{id}.jpg` |
| `style` | `text` not null | 默认 `'其他'` |
| `source` | `text` | 可空 |
| `tags` | `text` not null | 存 JSON 字符串，默认 `'[]'` |
| `width` / `height` | `integer` not null | 原图像素 |
| `note` | `text` | 可空 |
| `created_at` / `updated_at` | `text` not null | ISO 字符串 |
| `deleted_at` | `text` | 可空 |

索引（在 schema 或迁移里声明）：

- `char`  
- `style`  
- `created_at`  

生成并应用迁移：

```bash
pnpm db:generate
pnpm db:migrate
```

若 migrate 命令与当前 drizzle-kit 行为不一致，以 CLI 实际输出为准；目标是库里出现 `character_assets` 表。

验收：用任意 SQLite 工具或临时脚本能 `SELECT` 空表；`health` 仍正常。

### 3.2 服务端工具

新增工具文件（命名可微调，职责不要混）：

| 文件 | 职责 |
| --- | --- |
| `server/utils/paths.ts` | 项目根、`uploads` 各子目录、安全拼接相对路径；禁止 `..` 逃逸 |
| `server/utils/image.ts` | 用 sharp 读尺寸、生成缩略图（最长边 400）、写磁盘 |
| `server/utils/assets.ts` | 组装对外 DTO：把 `tags` 从 JSON 字符串解析成数组；拼 `thumbUrl` / `imageUrl` |
| `shared/schemas/asset.ts` 或 `server/utils/asset-schema.ts` | zod：创建元数据、更新元数据、列表 query |

zod 规则要点：

- `char`：`string`，`trim` 后长度 1，且匹配汉字（可用 Unicode 属性 `\p{Script=Han}`）  
- `style`：枚举 `STYLES`  
- `tags`：`string[]`，单项去空白、去重，可空数组  
- 列表 query：`page`（默认 1）、`pageSize`（默认 24，上限 100）、`char?`、`style?`、`tag?`  

图片写入约定：

1. 接收 multipart 文件（仅允许 `image/jpeg`、`image/png`、`image/webp`）  
2. 生成 `id`  
3. 原图存 `uploads/originals/{id}.{ext}`（ext 按 MIME 映射）  
4. 缩略图存 `uploads/thumbs/{id}.jpg`（缩略图格式统一，不必跟原图一致）  
5. 入库路径一律用正斜杠相对路径，不要存绝对路径  

失败时：已写磁盘则尽量删掉半成品文件，再返回错误。

### 3.3 只读媒体接口

新增 `server/api/media/[...path].get.ts`（或等价 catch-all）：

- 只允许读取 `uploads/originals|thumbs|exports/` 下的文件  
- 校验 path，拒绝 `..`、绝对路径、符号链接逃逸  
- 按扩展名设置 `Content-Type`  
- 找不到返回 404  

前端展示缩略图用：`/media/thumbs/{id}.jpg`；详情大图用：`/media/originals/...`。

### 3.4 素材 API

全部列表查询默认 `deleted_at IS NULL`。

| 方法 | 路径 | 行为 |
| --- | --- | --- |
| `GET` | `/api/assets` | 分页 + `char` 精确匹配 + `style` + `tag`（tags JSON 内包含）；按 `created_at` 倒序；返回 `{ items, total, page, pageSize }` |
| `GET` | `/api/assets/:id` | 单条；已删返回 404 |
| `POST` | `/api/assets` | multipart：`file` + 字段 `char`（必填）、`style`、`source`、`tags`（JSON 字符串或重复字段）、`note`；写图 + 入库；返回完整 DTO |
| `PATCH` | `/api/assets/:id` | 只改元数据（`char` / `style` / `source` / `tags` / `note`），不换图；更新 `updated_at` |
| `DELETE` | `/api/assets/:id` | 软删除：写 `deleted_at`；**本阶段不删磁盘文件** |
| `GET` | `/api/assets/by-char/:char` | 该字全部未删素材，按 `created_at` 倒序；给阶段 03 和本阶段「同字」展示共用 |

错误约定：

- 校验失败：`400`，body `{ message: '中文说明' }`  
- 找不到：`404`  
- 服务器异常：`500`，不把堆栈回给前端  

`POST /api/assets/batch` 本阶段可不做。若上传体验需要「一次选多张」，前端循环调单条 `POST` 即可。

建议用 Nuxt 文件路由：

```text
server/api/assets/index.get.ts
server/api/assets/index.post.ts
server/api/assets/[id].get.ts
server/api/assets/[id].patch.ts
server/api/assets/[id].delete.ts
server/api/assets/by-char/[char].get.ts
```

注意：`by-char/[char].get.ts` 与 `[id].get.ts` 不要冲突。Nuxt 按更具体路径匹配；确认 `by-char` 静态段优先。

### 3.5 前端：素材列表 `/assets`

替换 `app/pages/assets/index.vue` 占位。

页面结构：

1. 顶栏：标题「素材库」+「上传」按钮  
2. 筛选：汉字输入（精确）、书体 `NSelect`、可选标签输入；「查询 / 重置」  
3. 网格：每张卡片显示缩略图、汉字徽章、书体；同字多条各自一张卡  
4. 空态：`NEmpty`，提示去上传  
5. 底部分页  

交互：

- 点卡片进入 `/assets/:id`  
- 上传打开 `NModal` 或抽屉：`NUpload`（可多选）+ 每张图对应汉字输入；MVP 可简化为「同一批共用一个汉字 / 书体」，多写法以后再分开改  
- 上传成功后刷新列表；失败用 `useMessage` 提示中文原因  

列表请求用 `$fetch('/api/assets', { query })`。图片 `src` 用接口返回的 `/media/...` URL，**不要**用 blob 或 base64 塞列表。

可选：`app/stores/assets-filter.ts` 记住筛选条件，从详情返回仍保留。

### 3.6 前端：详情 `/assets/:id`

替换 `app/pages/assets/[id].vue`。

页面结构：

1. 左侧 / 上方：原图（`/media/originals/...`）  
2. 右侧表单：汉字、书体、来源、标签、备注；只读展示宽高、创建/更新时间  
3. 操作：保存（`PATCH`）、删除（`DELETE` 前 `NDialog` 确认）、返回列表  
4. 「同字其他写法」：调 `GET /api/assets/by-char/:char`，排除当前 id，点缩略图跳转对应详情  

删除成功后跳回 `/assets`。

### 3.7 上传组件拆分（建议）

抽组件，避免页面过重：

| 组件 | 职责 |
| --- | --- |
| `app/components/assets/AssetUploadModal.vue` | 选文件、填元数据、调用 `POST` |
| `app/components/assets/AssetGrid.vue` | 网格卡片 |
| `app/components/assets/AssetFilterBar.vue` | 筛选条 |

不是硬性文件名，但职责要拆开。

### 3.8 首页轻量更新

`app/pages/index.vue`：

- 调 `GET /api/assets?page=1&pageSize=1`（或另加极简 `GET /api/stats`）显示素材总数  
- 展示最近几条缩略图（`pageSize=8`）  
- 「最近作品」继续写「阶段 03」  

不要为首页单独搞复杂统计表。

### 3.9 类型检查与自测

```bash
pnpm typecheck
pnpm dev
```

手工验收清单见第 5 节。

---

## 4. 完成后的关键文件

```text
server/database/schema.ts              # character_assets
server/database/migrations/            # 生成的 SQL
server/utils/paths.ts
server/utils/image.ts
server/utils/assets.ts
server/api/media/[...path].get.ts
server/api/assets/index.get.ts
server/api/assets/index.post.ts
server/api/assets/[id].get.ts
server/api/assets/[id].patch.ts
server/api/assets/[id].delete.ts
server/api/assets/by-char/[char].get.ts
app/pages/assets/index.vue
app/pages/assets/[id].vue
app/components/assets/...              # 上传 / 网格 / 筛选
uploads/originals/*                    # 运行时文件，不提交
uploads/thumbs/*
```

---

## 5. 完成标准

- [ ] `pnpm db:migrate` 后存在 `character_assets` 表  
- [ ] 一次可选多张图上传；每张（或每批）汉字必填，非法汉字被拒绝  
- [ ] `uploads/originals` 与 `uploads/thumbs` 均有对应文件；列表接口与页面只使用缩略图 URL  
- [ ] `/media/...` 能显示图片；越权路径（如 `../package.json`）被拒绝  
- [ ] 按字、按书体能筛到正确结果；软删除后列表不可见，直接打开 id 为 404  
- [ ] 同一汉字上传 ≥2 张后，详情页「同字其他写法」能看到另一张  
- [ ] 刷新或重启 `pnpm dev` 后数据与图片仍在  
- [ ] `pnpm typecheck` 通过  
- [ ] 未引入集字 / 导出 / compositions 相关代码  

未满足以上任一项，不进入阶段 03。

---

## 6. 交给下一阶段

阶段 03 将：

- 新建 `compositions` 表与作品 API  
- 复用本阶段的 `GET /api/assets/by-char/:char` 做候选切换  
- 用缩略图 / 原图在 Canvas 上排版并导出  

不要在阶段 03 重做上传与素材 CRUD；缺能力只补本阶段的洞。
