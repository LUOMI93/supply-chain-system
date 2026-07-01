# Production Deployment

This guide targets a small VPS or internal server running Node.js 20/22 LTS, pnpm, SQLite, Nginx, and either PM2 or systemd.

## 1. Prepare The Server

```bash
sudo mkdir -p /opt/supply-chain-system
sudo mkdir -p /var/lib/supply-chain/uploads
sudo mkdir -p /var/lib/supply-chain/backups
```

Keep the SQLite database and uploads outside the app release directory so redeploys do not delete production data.

## 2. Environment Variables

Create `.env` on the server:

```env
NODE_ENV="production"
DATABASE_URL="file:/var/lib/supply-chain/prod.db"

AUTH_SECRET="replace-with-openssl-rand-base64-32"
AUTH_TRUST_HOST="true"
NEXTAUTH_URL="https://supply.example.com"

UPLOAD_DIR="/var/lib/supply-chain/uploads"
STORAGE_PROVIDER="local"

ADMIN_USERNAME="admin"
ADMIN_DISPLAY_NAME="管理员"
ADMIN_PASSWORD="replace-with-a-strong-initial-password"
```

Generate secrets:

```bash
openssl rand -base64 32
```

Do not use the development demo passwords `admin123`, `editor123`, or `viewer123` in production.

## 3. Install, Build, And Initialize

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:setup:prod
pnpm db:init:prod
pnpm prod:check
pnpm build
```

`pnpm db:generate` generates Prisma Client. `pnpm db:setup:prod` runs `prisma migrate deploy`, applies committed migrations only, and does not write demo users or demo product data.

`pnpm db:init:prod` creates the first active admin account from `ADMIN_USERNAME` and `ADMIN_PASSWORD` only when no active admin exists.

For local development or disposable demos only:

```bash
pnpm db:setup:dev
```

## 4. Database Migration Workflow

Use Prisma Migrate for all production schema changes.

When changing `prisma/schema.prisma` in development:

```bash
pnpm db:migrate:dev --name describe_the_change
pnpm lint
pnpm build
```

Commit both the schema change and the generated `prisma/migrations/<timestamp>_<name>/migration.sql`.

On production:

```bash
pnpm db:setup:prod
pnpm prod:check
```

Avoid `prisma db push` in production because it bypasses the migration history.

## 5. Run With PM2

```bash
pnpm add -g pm2
pm2 start "pnpm start" --name supply-chain-system
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 status
pm2 logs supply-chain-system
pm2 restart supply-chain-system
```

## 6. Run With systemd

Create `/etc/systemd/system/supply-chain-system.service`:

```ini
[Unit]
Description=Supply Chain System
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/supply-chain-system
EnvironmentFile=/opt/supply-chain-system/.env
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now supply-chain-system
sudo systemctl status supply-chain-system
```

## 7. Nginx And HTTPS

Example reverse proxy:

```nginx
server {
    listen 80;
    server_name supply.example.com;

    client_max_body_size 250m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Use Certbot or your provider's certificate automation to enable HTTPS, then set `NEXTAUTH_URL` to the final `https://` URL.

## 8. Upload Persistence

The app stores uploaded product images under `UPLOAD_DIR` and serves them as `/uploads/...` URLs. In production:

- Set `UPLOAD_DIR` to a persistent server path, for example `/var/lib/supply-chain/uploads`.
- Back up this directory together with the SQLite database.
- Do not point `UPLOAD_DIR` at `.next`, temporary CI artifacts, or a directory that is replaced during deploys.
- Each product accepts up to 12 images. Each image must be a supported image type and no larger than 10 MB.

## 9. SQLite Backup And Restore

Create a database backup:

```bash
pnpm backup:sqlite
```

The script creates `backups/<timestamp>/` with the SQLite database file, a copy of `UPLOAD_DIR` as `uploads/` when that directory exists, and `manifest.json`.

Set `BACKUP_DIR` to change the backup root and `BACKUP_KEEP` to control how many backups are retained. The default retention is 10 backups.

Restore a database backup:

```bash
BACKUP_PATH="backups/2026-07-01T02-30-00-000Z" pnpm restore:sqlite
```

The restore script makes a pre-restore copy of the current database under `backups/pre-restore-<timestamp>/`.

To restore only the database and skip uploads:

```bash
RESTORE_UPLOADS=false BACKUP_PATH="backups/2026-07-01T02-30-00-000Z" pnpm restore:sqlite
```

For older single-file backups:

```bash
BACKUP_FILE="backups/old/prod.db" pnpm restore:sqlite
```

Stop the app before restore and restart it after restore.

## 10. Deployment Check

Run before publishing a release:

```bash
pnpm prod:check
pnpm deploy:check
```

`pnpm prod:check` verifies production environment variables, database connectivity, upload directory writability, active admin users, and known weak demo passwords.

`pnpm deploy:check` runs lint and a production build.

## 11. PostgreSQL Upgrade Path

SQLite is acceptable for a small single-server start. Move to PostgreSQL when concurrent writes, multi-server deployment, or stronger operational tooling become important.

Upgrade outline:

1. Add a PostgreSQL database and change `DATABASE_URL` to `postgresql://...`.
2. Change `prisma/schema.prisma` datasource provider from `sqlite` to `postgresql`.
3. Create proper Prisma migrations with `prisma migrate dev` in a staging branch.
4. Export existing SQLite data and import it into PostgreSQL.
5. Run staging verification, then deploy with `prisma migrate deploy`.
