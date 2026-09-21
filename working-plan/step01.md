# Step 01 — Nuxt 基础框架

> 对应大纲：`working-plan/base.md` 第 3.1、3.2、3.3 节，以及第 4 节阶段 01  
> 决定：采用 **Nuxt 4 全栈**（2026-09-21）  
> 本阶段只搭可运行空壳，不写素材库和集字业务

---

## 1. 目标与不做

### 目标

一条 `pnpm dev` 能打开中文管理台空壳：

- Nuxt 4 页面、布局、Naive UI、Pinia 已接上  
- Nitro 能响应一个健康检查接口  
- SQLite 文件能在首次启动时创建，Drizzle 配置可直接给下一阶段建表  
- `uploads/` 三个子目录就位，且图片与数据库不进 git  

### 不做

- 不建 `character_assets` / `compositions` 表（阶段 02、03）  
- 不写上传、检索、集字、导出  
- 不引入 Fabric、Tailwind、Nuxt UI、登录、Docker  
- 不实现大纲第 2.3 节的业务页面，只留导航入口占位  

---

## 2. 本阶段采用的技术

| 项 | 约定 |
| --- | --- |
| 框架 | Nuxt `^4.5.2`，目录用 Nuxt 4 默认的 `app/` + `server/` |
| 渲染 | `ssr: false`。这是本机管理台，关闭 SSR 可避开 Naive UI 水合问题；接口仍由 Nitro 提供 |
| UI | naive-ui `^2.45.3`，全量注册，中文 locale |
| 状态 | `@pinia/nuxt`，本阶段只注册模块，不建业务 store |
| 数据库 | drizzle-orm `^0.45.2` + better-sqlite3 `^13.0.3` |
| 迁移工具 | drizzle-kit `^0.31.10`，配置写好，本阶段不生成业务迁移 |
| 校验 / 图片 | zod、sharp 本阶段安装并确认能在服务端加载，不写业务逻辑 |
| 包管理 | 只用 pnpm；Node 固定 22.x |

版本以大纲第 3.3 节为准。安装后若 lockfile 只差 patch，不必回改大纲。

---

## 3. 实施顺序

仓库里已有 `working-plan/` 和 git。初始化时不要删掉计划目录，也不要重新 `git init`。

### 3.1 初始化 Nuxt

在项目根目录执行。先看帮助，确认当前 CLI 的参数名，再初始化：

```bash
node -v   # 期望 v22.x
pnpm -v   # 期望 10.x
pnpm dlx nuxi@latest init --help
```

非空目录初始化（保留 `working-plan/`）：

```bash
pnpm dlx nuxi@latest init . --packageManager pnpm --gitInit false --force
```

若 CLI 因目录非空拒绝执行，改到临时目录生成后再把文件移回来，**不要覆盖** `working-plan/`。

初始化后检查：

- 存在 `nuxt.config.ts`、`package.json`、`app/`、`server/`（或 CLI 仍生成 `pages/` 时，按 Nuxt 4 挪到 `app/pages/`）  
- `package.json` 的 `packageManager` 为 pnpm  
- 没有把 `working-plan/` 写进 `.gitignore`  

然后安装本阶段依赖：

```bash
pnpm add naive-ui pinia @pinia/nuxt drizzle-orm better-sqlite3 zod sharp
pnpm add -D drizzle-kit @types/better-sqlite3 vue-tsc
```

`better-sqlite3` 或 `sharp` 编译失败时，确认 Node 为 22 后执行 `pnpm rebuild better-sqlite3 sharp`，不要改用其他数据库驱动。

### 3.2 改 Nuxt 配置

`nuxt.config.ts` 至少包含：

- `ssr: false`  
- `modules: ['@pinia/nuxt']`  
- `typescript.strict: true`  
- `nitro.experimental.tasks` 不需要开  
- 让 Nitro 把原生模块留在外部，避免打包 `better-sqlite3`：

```ts
export default defineNuxtConfig({
  ssr: false,
  modules: ['@pinia/nuxt'],
  typescript: {
    strict: true,
  },
  nitro: {
    externals: {
      external: ['better-sqlite3'],
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ['better-sqlite3'],
    },
  },
})
```

开发端口保持 Nuxt 默认 `3000`。不配置代理，前后端同一进程。

在 `package.json` 增加脚本：

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "typecheck": "nuxt typecheck",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

`db:migrate` 本阶段可以先挂上。真正的表迁移从阶段 02 开始跑。

### 3.3 中文管理台空壳

新增或修改这些文件：

| 文件 | 职责 |
| --- | --- |
| `app/plugins/naive-ui.ts` | `nuxtApp.vueApp.use(naive)`，全量注册组件 |
| `app/app.vue` | `NConfigProvider` 使用 `zhCN`、`dateZhCN`；包一层 `NMessageProvider`、`NDialogProvider`；里面是 `NuxtLayout` + `NuxtPage` |
| `app/layouts/default.vue` | 左侧或顶部导航，链到大纲中的路由 |
| `app/pages/index.vue` | 首页只显示项目名、框架状态、健康检查结果 |
| `app/pages/assets/index.vue` | 占位：文案「阶段 02 实现」 |
| `app/pages/assets/[id].vue` | 占位 |
| `app/pages/compose/new.vue` | 占位 |
| `app/pages/compose/[id].vue` | 占位 |
| `app/pages/compositions/index.vue` | 占位 |

导航文案用中文：概览、素材库、新建集字、作品。占位页不要做表单和列表。

首页用 `$fetch('/api/health')` 显示数据库是否可连接。请求失败时用 Naive UI 的提示，不要白屏。

不建 Pinia store。模块注册成功即可，业务状态从阶段 02 再加。

### 3.4 数据库连接

目录：

```text
server/database/schema.ts          # 本阶段只导出空 schema 对象，不建业务表
server/database/migrations/        # 空目录，保留 .gitkeep
server/utils/db.ts                 # 打开 SQLite，并保证 data/ 目录存在
drizzle.config.ts
data/.gitkeep
```

`server/utils/db.ts` 约定：

- 数据库路径固定为项目根目录 `data/yan-calligraphy.sqlite`  
- 使用 `node:path` 从项目根解析，不把绝对路径写死到个人机器  
- 目录不存在时先 `mkdirSync`  
- 只在服务端引用 `better-sqlite3` 和 `drizzle-orm/better-sqlite3`  
- 导出一个复用的 `db` 实例  

`drizzle.config.ts`：

- `dialect: 'sqlite'`  
- `schema: './server/database/schema.ts'`  
- `out: './server/database/migrations'`  
- `dbCredentials.url` 指向 `./data/yan-calligraphy.sqlite`  

`server/database/schema.ts` 本阶段可以是空的 `export {}`。不要提前建大纲里的两张业务表。

健康检查 `server/api/health.get.ts`：

- 执行 `select 1`  
- 成功返回 `{ ok: true, db: true }`  
- 失败返回 500，body 里带简短中文原因，不把堆栈直接给页面  

首次请求成功后，磁盘上应出现 `data/yan-calligraphy.sqlite`。

### 3.5 上传目录与忽略规则

创建目录（各放一个 `.gitkeep`）：

```text
uploads/originals/
uploads/thumbs/
uploads/exports/
```

`.gitignore` 增加：

```gitignore
data/*.sqlite
data/*.sqlite-*
uploads/originals/**
uploads/thumbs/**
uploads/exports/**
!uploads/**/.gitkeep
.nuxt
.output
node_modules
```

确认 `working-plan/` 不被忽略。

本阶段不写 `/media/**` 静态访问。上传和读图从阶段 02 开始。

sharp、zod 只要求能被服务端 import。可在健康检查里读取 `sharp.versions` 一类的只读信息，证明原生模块加载成功；不要做缩放或校验业务入参。

### 3.6 类型检查

```bash
pnpm typecheck
pnpm dev
```

`pnpm dev` 打开 `http://localhost:3000`：

1. 首页是中文，能看到健康检查成功  
2. 导航能进入 5 个占位路由，刷新不 404  
3. 停掉进程再启动，SQLite 文件仍在  
4. `git status` 不包含 sqlite 和 `uploads` 里的业务文件  

---

## 4. 完成后的目录

```text
yan-calligraphy/
  app/
    app.vue
    layouts/default.vue
    pages/index.vue
    pages/assets/index.vue
    pages/assets/[id].vue
    pages/compose/new.vue
    pages/compose/[id].vue
    pages/compositions/index.vue
    plugins/naive-ui.ts
  server/
    api/health.get.ts
    database/schema.ts
    database/migrations/.gitkeep
    utils/db.ts
  uploads/originals/.gitkeep
  uploads/thumbs/.gitkeep
  uploads/exports/.gitkeep
  data/.gitkeep
  drizzle.config.ts
  nuxt.config.ts
  working-plan/
```

`data/yan-calligraphy.sqlite` 由运行时生成，不提交。

---

## 5. 完成标准

- [ ] `pnpm dev` 单进程打开首页，界面为中文  
- [ ] `/api/health` 返回数据库连接成功  
- [ ] `data/yan-calligraphy.sqlite` 已生成，且被 git 忽略  
- [ ] `uploads/{originals,thumbs,exports}` 存在  
- [ ] 大纲中的 6 个路由都能打开（业务页允许是占位）  
- [ ] `pnpm typecheck` 通过  
- [ ] 依赖与大纲第 3.3 节一致，没有引入分离方案的 Vite / Hono  

未满足以上任一项，不进入阶段 02。

---

## 6. 交给下一阶段

阶段 02 直接在本阶段的空 schema 上追加 `character_assets`，用已有的 `db:generate` / `db:migrate` 建表，并开始写 `/api/assets`。不要重做 Nuxt、Naive UI 或数据库连接。
