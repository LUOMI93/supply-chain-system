# Supply Chain System

供应链产品管理系统，基于 Next.js、Prisma 和 SQLite。

## 环境要求

- Node.js 20 或 22 LTS
- pnpm

> 如果在 Node.js 24 下执行 `prisma db push` 遇到空的 `Schema engine error`，请先切换到 Node.js 20/22 LTS 后重试。

## 本地启动

1. 安装依赖：

```bash
pnpm install
```

2. 创建本地环境变量文件：

```bash
cp .env.example .env
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

本地默认使用 SQLite：

```env
DATABASE_URL="file:./dev.db"
```

3. 初始化数据库并写入示例数据：

```bash
pnpm db:setup
```

这一步会执行：

- `prisma generate`
- `prisma db push`
- `tsx scripts/seed.ts`

4. 启动开发服务：

```bash
pnpm dev
```

浏览器打开：

```text
http://localhost:3000
```

## 测试账号

```text
admin  / admin123
editor / editor123
viewer / viewer123
```

## 常用命令

```bash
pnpm db:generate  # 生成 Prisma Client
pnpm db:push      # 同步数据库结构
pnpm seed         # 写入示例数据
pnpm db:setup     # 初始化数据库并写入示例数据
pnpm dev          # 启动开发服务
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务
pnpm lint         # 运行 ESLint
```

## pnpm 构建脚本说明

项目使用 pnpm 的 `allowBuilds` 配置允许 Prisma、Sharp、unrs-resolver 和 esbuild 执行安装期构建脚本。

`tsx` 依赖 esbuild。如果没有允许 esbuild 构建，执行 `pnpm exec tsx scripts/seed.ts` 时可能会失败。

## 本地文件

以下文件是本地运行产物，不需要提交：

- `.env`
- `.next/`
- `node_modules/`
- `prisma/dev.db`
- `next-env.d.ts`
