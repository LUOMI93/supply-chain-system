# Supply Chain System

供应链产品管理系统，基于 Next.js、Prisma 和 SQLite。

## 环境要求

- Node.js 20 或 22 LTS
- pnpm

> 如果在 Node.js 24 下执行 `prisma db push` 遇到空的 `Schema engine error`，请先切换到 Node.js 20/22 LTS 后重试。

## 本地启动

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:setup:dev
pnpm dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

本机访问：

```text
http://localhost:3000
```

`pnpm db:setup:dev` 会执行 `prisma migrate deploy`，并写入开发演示数据。

## 开发演示账号

以下账号只用于本地开发或一次性演示环境，禁止用于生产：

```text
admin  / admin123
editor / editor123
viewer / viewer123
```

生产环境请使用 `pnpm db:setup:prod` 和 `pnpm db:init:prod` 初始化，详见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 局域网临时访问

如果需要让同一个 Wi-Fi 或局域网里的其他设备访问，请先确认本机局域网 IP，然后在 `.env` 里配置：

```env
LAN_HOST="192.168.1.10"
```

如果有多个访问地址，可以用逗号分隔：

```env
LAN_HOST="192.168.1.10,10.0.0.8"
```

然后重新启动开发服务：

```bash
pnpm dev
```

其他设备访问：

```text
http://你的局域网IP:3000
```

`LAN_HOST` 只用于本地开发模式，换网络或换电脑后如果 IP 变化，需要同步更新 `.env` 并重启服务。

## 生产部署

正式部署到服务器时，不要使用 `pnpm dev`，也不要运行开发 seed。推荐流程：

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:setup:prod
pnpm db:init:prod
pnpm build
pnpm start
```

生产环境必须配置：

```env
NODE_ENV="production"
DATABASE_URL="file:/var/lib/supply-chain/prod.db"
AUTH_SECRET="your-random-secret"
AUTH_TRUST_HOST="true"
NEXTAUTH_URL="https://supply.example.com"
UPLOAD_DIR="/var/lib/supply-chain/uploads"
STORAGE_PROVIDER="local"
ADMIN_PASSWORD="replace-with-a-strong-initial-password"
```

完整的 PM2/systemd、Nginx、HTTPS、备份恢复和 SQLite 到 PostgreSQL 升级说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 常用命令

```bash
pnpm db:generate    # 生成 Prisma Client
pnpm db:push        # 手动同步数据库结构，仅用于本地临时调试
pnpm db:migrate:dev # 创建/应用开发迁移
pnpm db:migrate:deploy # 应用已提交迁移，生产使用
pnpm seed           # 写入开发演示数据，生产环境默认拒绝运行
pnpm db:setup:dev   # 初始化开发库并写入演示数据
pnpm db:setup:prod  # 生产应用迁移，不写入演示数据
pnpm db:init:prod   # 创建生产首个管理员
pnpm backup:sqlite  # 备份 SQLite 数据库文件
pnpm restore:sqlite # 从 BACKUP_PATH 或 BACKUP_FILE 恢复 SQLite 数据库文件
pnpm prod:check     # 检查生产环境变量、数据库、上传目录和弱密码
pnpm dev            # 启动开发服务
pnpm build          # 构建生产版本
pnpm start          # 启动生产服务
pnpm lint           # 运行 ESLint
pnpm deploy:check   # lint + build
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
- `public/uploads/`
- `next-env.d.ts`
