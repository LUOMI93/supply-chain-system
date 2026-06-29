# 供应链管理系统 · 后端架构重构方案

> 版本：v2.0 | 日期：2026-06-24 | 架构师：Backend Architect

---

## 一、当前架构问题诊断

| # | 问题 | 影响 | 严重度 |
|---|------|------|--------|
| 1 | `AUTH_URL` 硬编码为固定 IP | IP/域名变化后登录失效 | 🔴 高 |
| 2 | Cookie 配置硬编码 | 浏览器兼容性问题，HTTPS 下 cookie 写入失败 | 🔴 高 |
| 3 | 无中间件路由保护 | 未登录用户可直接访问受保护页面 URL | 🟡 中 |
| 4 | SQLite 本地文件数据库 | 无法支持多用户并发、无横向扩展能力 | 🔴 高 |
| 5 | 单体 Next.js 架构 | 所有功能耦合在一起，无法独立扩展 | 🟡 中 |
| 6 | 无 API 层版本管理 | 前端强耦合当前 API 结构，迭代易断 | 🟡 中 |
| 7 | 无缓存层 | 每次请求都查数据库，量大后响应慢 | 🟡 中 |
| 8 | 无操作日志审计优化 | `audit_logs` 表无限增长，未做归档 | 🟢 低 |

---

## 二、目标架构设计

### 2.1 架构模式

```
当前：单体 Next.js (SQLite + NextAuth)
                ↓ 重构
目标：分层架构 (PostgreSQL + Redis + NextAuth + 缓存层)
```

### 2.2 技术栈升级

| 组件 | 当前 | 目标 | 理由 |
|------|------|------|------|
| 数据库 | SQLite | **PostgreSQL** | 支持并发、事务、JSON 字段、扩展性强 |
| ORM | Prisma | **Prisma**（保留） | 已在使用，类型安全，迁移方便 |
| 认证 | NextAuth v5 | **NextAuth v5**（保留+优化） | 修复后稳定，支持 JWT + 数据库 session |
| 缓存 | 无 | **Redis** | 缓存 session、热点数据、减数据库压力 |
| 文件存储 | 本地 `public/uploads` | **本地 OSS 双模式** | 已支持，建议生产切 OSS |
| 部署 | 本地 `next dev` | **PM2 + Nginx 反向代理** | 进程守护、负载均衡、HTTPS 终止 |

---

## 三、数据库架构设计（PostgreSQL）

### 3.1 核心表结构优化

```sql
-- 用户表（权限系统）
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    display_name  VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt
    role          VARCHAR(20)  NOT NULL DEFAULT 'viewer',
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    last_login_at TIMESTAMP(3),
    created_at    TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role     ON users(role) WHERE is_active = true;

-- 供应商表
CREATE TABLE suppliers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    contact     VARCHAR(100),
    remark      TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- 产品表（优化：加索引、分区建议）
CREATE TABLE products (
    id            SERIAL PRIMARY KEY,
    supplier_id   INT NOT NULL REFERENCES suppliers(id),
    sku           VARCHAR(100) NOT NULL,
    name_zh       VARCHAR(300) NOT NULL,
    -- ... 其他字段
    created_at    TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP(3) NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_sku      ON products(sku);
CREATE INDEX idx_products_name_zh  ON products USING gin(to_tsvector('simple', name_zh));

-- 用户-供应商可见性（多对多）
CREATE TABLE user_supplier_visibility (
    user_id    INT NOT NULL REFERENCES users(id),
    supplier_id INT NOT NULL REFERENCES suppliers(id),
    PRIMARY KEY (user_id, supplier_id)
);

-- 审计日志（分区表，按月份自动分区）
-- 建议：products/operators 大表做分区，日志表做冷热分离
```

### 3.2 Prisma Schema 对应升级

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"  // ← 从 sqlite 改为 postgresql
  url      = env("DATABASE_URL")
}

model User {
  id            Int    @id @default(autoincrement())
  username      String @unique
  displayName   String?
  passwordHash  String @map("password_hash")
  role          String  @default("viewer")
  isActive      Boolean @default(true) @map("is_active")
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  visibleSuppliers UserSupplierVisibility[]
  auditLogs        AuditLog[]

  @@index([username])
  @@map("users")
}

model Supplier {
  id          Int      @id @default(autoincrement())
  name        String
  contact     String?
  remark      String?
  isActive    Boolean   @default(true) @map("is_active")
  products    Product[]
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@map("suppliers")
}

model Product {
  id          Int      @id @default(autoincrement())
  supplierId  Int      @map("supplier_id")
  sku         String
  nameZh      String   @map("name_zh")
  // ... 其他字段
  supplier    Supplier @relation(fields: [supplierId], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([supplierId])
  @@index([sku])
  @@fulltext([nameZh])
  @@map("products")
}
```

---

## 四、认证与安全架构

### 4.1 修复后的 NextAuth 配置（已完成）

- ✅ 删除 `AUTH_URL` 硬编码 → 自动从请求检测
- ✅ `useSecureCookies: NODE_ENV===production` → HTTPS 自动加固
- ✅ `trustHost: true` → 支持任意访问地址（localhost / IP / 域名）
- ✅ 添加 `middleware.ts` → 未登录自动跳转到 `/login`

### 4.2 安全加固建议

```
当前：HTTP + 无 Rate Limit
                ↓
目标：
  - Nginx 层：Rate Limit 50r/m IP（登录接口）
  - API 层：统一的错误处理，不泄露敏感信息
  - 数据库：所有查询用 Prisma 参数化，防 SQL 注入
  - 文件上传：限制文件类型 + 大小 + 存在 OSS 私有 bucket
```

---

## 五、API 架构设计

### 5.1 统一响应格式

```typescript
// 成功响应
{ data: T, meta?: { total: number; page: number } }

// 错误响应
{ error: string, code: string, details?: unknown }
```

### 5.2 API 路由分层

```
src/
  ├── app/api/          # Next.js Route Handlers（保留）
  │   ├── auth/         # NextAuth 认证路由
  │   ├── products/     # 产品 CRUD
  │   ├── suppliers/   # 供应商 CRUD
  │   ├── users/       # 用户管理
  │   ├── catalog/     # 目录视图（聚合查询）
  │   ├── dashboard/   # 统计聚合
  │   ├── export/      # Excel 导出
  │   └── upload/      # 文件上传（新增，替代直接写 public/）
  ├── lib/
  │   ├── auth.ts      # NextAuth 配置（已修复）
  │   ├── auth-utils.ts # 权限工具函数
  │   ├── prisma.ts    # Prisma 单例
  │   ├── redis.ts     # Redis 客户端（新增）
  │   ├── constants.ts # 常量
  │   └── validations/ # Zod 校验 schema（新增）
  └── middleware.ts     # 路由保护（已添加）
```

---

## 六、缓存架构（新增 Redis）

```
热点数据缓存策略：

1. Session Cache（可选）
   - Key:   session:{sessionToken}
   - TTL:   30d（与 JWT maxAge 一致）
   - 命中率：高（已登录用户每次请求都带 session）

2. 目录数据缓存
   - Key:   catalog:all  /  catalog:supplier:{id}
   - TTL:   5 min
   - 失效：产品/供应商增删改时主动清除

3. 统计数据缓存
   - Key:   dashboard:stats
   - TTL:   10 min
   - 后台刷新：低优先级，可接受短暂不一致
```

---

## 七、部署架构

### 7.1 推荐部署拓扑

```
                   ┌─────────────────────┐
                   │   Nginx (Reverse Proxy)   │
                   │   - HTTPS 终止           │
                   │   - Rate Limit            │
                   │   - 静态文件服务          │
                   └──────────┬──────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │ Next.js #1 │  │ Next.js #2 │  │ Next.js #3 │
        │ (PM2)     │  │ (PM2)     │  │ (PM2)     │
        └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │ PostgreSQL │  │   Redis    │  │   OSS     │
        │ (主从)    │  │ (缓存)    │  │ (文件存储) │
        └───────────┘  └───────────┘  └───────────┘
```

### 7.2 环境变量管理

```bash
# .env.production
DATABASE_URL="postgresql://user:pass@localhost:5432/supply_chain"
AUTH_SECRET="生产环境专用随机密钥"
# AUTH_URL 不设，让框架自动检测
NODE_ENV="production"

# Redis（新增）
REDIS_URL="redis://localhost:6379"

# 文件存储
STORAGE_PROVIDER="oss"
OSS_BUCKET="..."
OSS_REGION="..."
```

---

## 八、实施步骤（分阶段）

### Phase 1：修复登录问题（已完成 ✅）
- [x] 删除 `AUTH_URL` 硬编码
- [x] 优化 `auth.ts` cookie 配置
- [x] 添加 `middleware.ts` 路由保护

### Phase 2：数据库迁移（SQLite → PostgreSQL）
1. 安装 PostgreSQL，创建数据库
2. 更新 `prisma/schema.prisma` provider 为 `postgresql`
3. `npx prisma db push` 推送 schema
4. 写脚本迁移现有 SQLite 数据到 PostgreSQL
5. 测试所有 CRUD 功能

### Phase 3：添加 Redis 缓存层
1. 安装 Redis
2. 创建 `src/lib/redis.ts` 单例客户端
3. 在目录 API、统计 API 添加缓存逻辑
4. 在产品/供应商增删改时清除对应缓存

### Phase 4：Nginx + PM2 生产部署
1. 配置 Nginx 反向代理 + HTTPS
2. 配置 Rate Limit
3. PM2 启动多个 Next.js 实例
4. 配置 GitHub Actions / 手动部署脚本

### Phase 5：监控与日志
1. 添加请求日志中间件
2. 添加关键操作审计（已有 `AuditLog` 表）
3. 数据库慢查询监控
4. 错误上报（Sentry / 自研）

---

## 九、成功指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 登录成功率（IP/域名访问） | ~50% | 99.9% |
| API 平均响应时间 | ~200ms | <100ms（加缓存后） |
| 并发用户支持 | ~5 | 100+ |
| 数据库 | SQLite | PostgreSQL（支持并发写入）|
| 部署方式 | `next dev` | PM2 + Nginx（进程守护）|
