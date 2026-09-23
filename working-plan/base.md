# yan-calligraphy 指导大纲

> 更新时间：2026-09-23  
> 文档角色：后续 `working-plan/stepNN.md` 的指导性大纲  
> 项目路径：`/Users/yangang/Desktop/code/yan-calligraphy`  
> 代码状态：阶段 01–04 已落地；多字切分入库见 `prd/multi-char-ingest.md`

---

## 0. 文档怎么用

本文件只回答三件事：**做什么产品、有哪些功能、研发时可以依赖哪些技术储备**。

不在这里写逐步安装命令、文件级任务或某一阶段的验收勾选。那些内容按阶段拆到 step 文件。

| 规则 | 说明 |
| --- | --- |
| 大纲优先 | step 文件以本文的产品目标、功能边界、技术约束为准 |
| 一阶段一文件 | 每个 step 只拆一个阶段，不把后续阶段的实现细节写进来 |
| 先改大纲再改范围 | 要扩大功能、更换存储或锁定技术框架，先改本文，再改对应 step |
| 选型回写 | 应用框架已于 2026-09-21 锁定为 Nuxt 4，见「已锁定决策」 |

建议的 step 文件结构：

1. 本阶段目标与不做什么  
2. 对应本文哪些章节  
3. 具体任务与顺序  
4. 完成标准  

---

## 1. 产品定位

面向书法博主的**个人单字素材库 + 集字排版工作台**。

使用方式：自己拍单字照片，上传进管理系统；集字时按字挑选不同写法，套用布局组合成作品，并导出图片。

| 维度 | 定位 |
| --- | --- |
| 使用者 | 博主本人，单人使用 |
| 运行形态 | 本机 Web 应用，先不上云 |
| 界面语言 | 中文 |
| 成功标准 | 能完成「入库 → 检索 → 选字 → 布局 → 导出」闭环 |
| 不是什么 | 不是公开字库、不是多用户后台、不是自动生成 TTF 字体的工具 |

---

## 2. 产品功能

### 2.1 核心闭环

1. 上传单字照片并归档  
2. 按汉字 / 书体 / 标签检索  
3. 输入目标文案，为每个字挑选照片  
4. 按布局组合预览  
5. 导出成品图，用于发笔记或存档  

### 2.2 MVP 功能

| 模块 | 功能 | 验收口径 |
| --- | --- | --- |
| 素材入库 | 上传单字照片；填写汉字、书体、来源、备注 | 一次可处理多张；汉字必填 |
| 素材管理 | 网格浏览、按字检索、按书体筛选、编辑元数据、软删除 | 列表用缩略图，不直接加载原图 |
| 同字多写法 | 同一个字可以有多张照片，集字时切换 | 至少能在候选里切换 2 种写法 |
| 集字工作台 | 输入文案、拆字、为每个字选图、实时预览 | 缺字标出，不阻塞其他字排版 |
| 布局 | 竖排、横排、宫格 | 可调字距、行距、边距；宫格可调列数 |
| 作品 | 保存、再次打开、继续编辑 | 刷新后作品与图片仍在 |
| 导出 | 导出 PNG | 按 2x 清晰度导出，预览与导出共用同一套布局规则 |

集字编辑器的交互口径：

1. 输入文案后拆成字符序列（空白与标点的处理方式可配置）  
2. 每个字显示当前选中的缩略图；没有素材则标红「缺字」  
3. 点选某个字，列出该字全部候选，点击即替换  
4. 切换竖排 / 横排 / 宫格，并调节字距、行距、边距  
5. 预览实时更新，再导出 PNG  

### 2.3 页面职责

| 路由 | 职责 |
| --- | --- |
| `/` | 概览：素材数量、最近上传、最近作品 |
| `/assets` | 素材网格、搜索筛选、上传入口 |
| `/assets/:id` | 单字详情与元数据编辑 |
| `/compose/new` | 新建集字 |
| `/compose/:id` | 集字编辑器 |
| `/compositions` | 作品列表 |

### 2.4 明确不做（MVP）

- ~~自动抠字、去背景、OCR 识别汉字~~ → 已立项为增强，见第 2.5 节第 1 项与 `prd/multi-char-ingest.md`  
- 生成矢量字或 TTF 字体  
- 多用户、登录、权限  
- 公开字库或社区  
- 云存储、Redis、Postgres  
- Docker、独立移动 App  

手机通过局域网访问本机，属于后续增强，不进入 MVP。

### 2.5 后续增强（不默认排期）

按价值排序，需要时再单独立项：

1. **多字图切分入库**（已写需求）：上传含多字的整图 → 文字区域识别（可手动补标）→ 透明背景抠图 → 拆成单字素材写入现有素材库。需求全文：`prd/multi-char-ingest.md`；实施计划：`working-plan/step05.md`  
2. 批量上传，以及从文件名辅助填写汉字  
3. 对联、斗方等专用模板  
4. 画布内拖拽微调、宣纸等背景  
5. 局域网手机上传  
6. 服务端高清合成与批量导出  
7. 照片量变大后再考虑云备份  

---

## 3. 研发技术储备

这里记录后续 step 可以依赖的工程约束和领域模型。应用框架已锁定为 **Nuxt 4 全栈**。

### 3.1 已锁定的工程约束

这些项不随框架选择改变：

| 项 | 约定 |
| --- | --- |
| 包管理器 | pnpm，不混用 npm / yarn |
| Node.js | 22.x LTS（本机 `v22.16.0`） |
| 语言 | TypeScript 严格模式 |
| 元数据 | SQLite 单文件：`data/yan-calligraphy.sqlite` |
| 图片 | 项目目录 `uploads/`，不进数据库 |
| UI 组件 | Naive UI，管理台用中文 |
| UI 间距 | **内外边距与布局 gap 统一 12px**（见 `.cursor/rules/ui-spacing.mdc`）；`0` 复位与集字 `layoutConfig` 除外 |
| 客户端状态 | Pinia，只管编辑草稿、筛选等界面状态 |
| 集字画布 | MVP 用原生 Canvas 2D；拖拽复杂度上来再评估 Fabric |
| 图片处理 | sharp：缩略图，以及日后的服务端缩放 |
| 校验 | zod |
| 数据访问 | Drizzle ORM，钉在 0.45 稳定线，不跟 Drizzle 1 RC |
| 导出策略 | MVP 在浏览器 Canvas 导出 PNG；服务端 sharp 合成为后续选项 |

图片目录：

```text
uploads/
  originals/   # 原图
  thumbs/      # 列表缩略图，约 300–400px
  exports/     # 集字导出 PNG
```

### 3.2 应用框架

已锁定 **Nuxt 4 全栈**（页面与 `server/api` 在同一项目）。落地步骤见 `working-plan/step01.md`。

本机管理台关闭 SSR（`ssr: false`），避免 Naive UI 水合问题；接口仍走 Nitro。前后端分离方案不再采用。

### 3.3 版本储备（2026-09-21 查询）

脚手架安装时以 lockfile 为准，允许 patch 升级；major 升级必须先改本文。

共用：

| 组件 | 版本 |
| --- | --- |
| Node.js | 22.x（本机 `v22.16.0`） |
| pnpm | 10.x（本机 `10.11.1`） |
| TypeScript | ~5.9（`5.9.2` 线） |
| vue-tsc | ^3.3（`3.3.11`） |
| vue | ^3.5.43 |
| pinia | ^3.0.3 |
| naive-ui | ^2.45.3 |
| drizzle-orm | ^0.45.2 |
| drizzle-kit | ^0.31.10 |
| better-sqlite3 | ^13.0.3 |
| zod | ^4.1（查询时 `4.6.5`） |
| sharp | 脚手架时取当前稳定版（查询时 `0.35.4`） |
| konva | ^10.6.0（Step 05 标注画布） |
| vue-konva | ^4.0.1（Step 05 Vue 绑定） |
| fabric（备选，非 MVP） | ^7.4.0 |

Nuxt 全栈额外依赖：

| 组件 | 版本 |
| --- | --- |
| nuxt | ^4.5.2 |
| vue-router | 随 Nuxt 4 引入（约 ^5.2） |
| 请求 | Nuxt 内置 `$fetch` / ofetch |

### 3.4 数据模型

`character_assets`（单字素材）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | text/uuid | 主键 |
| char | text | 汉字，必填，单字 |
| image_path | text | 原图相对路径 |
| thumb_path | text | 缩略图路径 |
| style | text | 楷 / 行 / 草 / 隶 / 篆 / 其他 |
| source | text | 帖名或来源，可空 |
| tags | json | 标签数组 |
| width / height | int | 原图像素尺寸 |
| note | text | 备注 |
| created_at / updated_at | datetime | |
| deleted_at | datetime | 软删除，可空 |

索引：`char`、`style`、`created_at`。集字检索以 `char` 精确匹配为主。

`compositions`（集字作品）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | text/uuid | 主键 |
| title | text | 作品名 |
| text | text | 目标文案 |
| layout_type | text | `vertical` / `horizontal` / `grid` |
| layout_config | json | 字距、行距、边距、列数、背景 |
| items | json | `[{ char, assetId, x, y, scale, rotate }]` |
| export_path | text | 最近一次导出路径，可空 |
| created_at / updated_at | datetime | |

`layout_config` 公共字段：

- `cellSize`：字框边长（px）  
- `gap`：字距  
- `lineGap`：行距  
- `padding`：画布边距  
- `columns`：宫格列数，仅 `grid`  
- `background`：颜色或纹理 key  

布局规则：

| 类型 | 规则 |
| --- | --- |
| `vertical` | 自上而下；满列后换到右侧下一列，或保持单列条幅 |
| `horizontal` | 从左到右，满行换行 |
| `grid` | 按 `columns` 填宫格 |

每个字先算出 `{ x, y, size }`。用户微调后的 `scale` 和偏移要能写回 `items`。

### 3.5 API 契约

路径与资源名保持一致，不因框架选择改名。

素材：

- `GET /api/assets` — 分页，支持 `char` / `style` / `tag`  
- `GET /api/assets/:id`  
- `POST /api/assets` — multipart 上传 + 元数据  
- `POST /api/assets/batch` — 批量上传，可后置  
- `PATCH /api/assets/:id`  
- `DELETE /api/assets/:id` — 软删除  
- `GET /api/assets/by-char/:char` — 同字候选，编辑器高频接口  

作品：

- `GET /api/compositions`  
- `GET /api/compositions/:id`  
- `POST /api/compositions`  
- `PATCH /api/compositions/:id`  
- `DELETE /api/compositions/:id`  

图片访问使用专用只读路径（如 `/media/**`），不把 `uploads` 目录直接暴露成可写接口。

### 3.6 目标架构（框架无关）

```text
浏览器（中文管理台）
  ├─ 素材库：上传 / 检索 / 编辑
  ├─ 集字编辑器：拆字 → 选图 → 布局 → 预览 → 导出
  └─ 作品列表
        │
        ▼
本地 HTTP API
  ├─ 素材与作品 CRUD
  ├─ 上传：原图 + sharp 缩略图
  └─ 布局计算（纯函数，可单测）
        │
        ├─ SQLite（元数据）
        └─ uploads/（图片）
```

布局计算放在不依赖 UI 框架的纯函数里，方便单测，也方便以后换成服务端合成。

### 3.7 风险

| 风险 | 对策 |
| --- | --- |
| 原图过大，列表卡顿 | 列表只用缩略图；原图仅在详情和画布按需加载 |
| 同字写法多，难挑选 | 候选区展示大图、来源和标签 |
| better-sqlite3 编译失败 | 固定 Node 22；文档写明 `pnpm rebuild` |
| 导出发糊 | 固定 2x 或 3x；预览和导出共用布局函数 |
| 照片没有备份 | 后续提供打包 `data/` 与 `uploads/` 的方式 |

---

## 4. 阶段大纲

step 文件按此顺序拆任务。未列出的文件表示该阶段还没写计划。

| 阶段 | 文件 | 目标 | 计划状态 |
| --- | --- | --- | --- |
| 01 | `working-plan/step01.md` | 搭好可运行的 Nuxt 基础框架（空壳、数据库、上传目录） | 已完成 |
| 02 | `working-plan/step02.md` | 素材入库、检索、编辑 | 已完成 |
| 03 | `working-plan/step03.md` | 集字选图、三种布局、导出 PNG | 已完成 |
| 04 | `working-plan/step04.md` | 间距调节、拖拽微调、背景与导出打磨 | 已完成 |
| 05 | `working-plan/step05.md` | 多字图切分入库 M1（对应 `prd/multi-char-ingest.md`） | 编码完成，待手动验收 |
| 06+ | 按需 | 第 2.5 节其余增强项 | 不默认排期 |

MVP 对应阶段 01–03。阶段 04 让日常使用顺手，阶段 05 不阻塞前面的验收。

全局验收（MVP）：

- 本机能完成：上传 → 标注 → 搜索 → 集字 → 竖排 / 横排 / 宫格 → 导出 PNG  
- 重启后数据和图片仍在  
- 缺字可见，且不挡住其他字  
- 同一个字至少可以切换 2 种写法  
- 依赖版本与本文一致  

---

## 5. 已锁定决策

| 决策 | 状态 |
| --- | --- |
| 产品范围、MVP 边界、数据模型、API 路径 | 已锁定，以本文第 1–3 节为准 |
| 应用框架 | **已锁定 Nuxt 4 全栈**（2026-09-21）。`ssr: false`，接口用 Nitro `server/api` |
