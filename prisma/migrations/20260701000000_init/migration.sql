-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_supplier_visibility" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    CONSTRAINT "user_supplier_visibility_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_supplier_visibility_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_column_prefs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "columns" TEXT NOT NULL DEFAULT '[]',
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_column_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "remark" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "product_groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sku" TEXT NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "product_link" TEXT,
    "product_weight" TEXT,
    "product_size" TEXT,
    "package_size" TEXT,
    "package_weight" TEXT,
    "box_quantity" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "product_groups_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "product_groups_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_specs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "group_id" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "factory_code" TEXT,
    "spec" TEXT,
    "cost_price" TEXT,
    "sale_price" TEXT,
    "car_model" TEXT,
    "oe_code" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "product_specs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "product_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "group_id" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "product_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER,
    "detail" TEXT,
    "ip_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_supplier_visibility_user_id_supplier_id_key" ON "user_supplier_visibility"("user_id", "supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_column_prefs_user_id_key" ON "user_column_prefs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_groups_sku_key" ON "product_groups"("sku");

-- CreateIndex
CREATE INDEX "product_groups_supplier_id_idx" ON "product_groups"("supplier_id");

-- CreateIndex
CREATE INDEX "product_groups_sku_idx" ON "product_groups"("sku");

-- CreateIndex
CREATE INDEX "product_groups_is_public_idx" ON "product_groups"("is_public");

-- CreateIndex
CREATE INDEX "product_groups_deleted_at_idx" ON "product_groups"("deleted_at");

-- CreateIndex
CREATE INDEX "product_specs_group_id_idx" ON "product_specs"("group_id");

-- CreateIndex
CREATE INDEX "product_specs_sku_idx" ON "product_specs"("sku");

-- CreateIndex
CREATE INDEX "product_specs_oe_code_idx" ON "product_specs"("oe_code");

-- CreateIndex
CREATE INDEX "product_specs_factory_code_idx" ON "product_specs"("factory_code");

-- CreateIndex
CREATE INDEX "product_specs_spec_idx" ON "product_specs"("spec");

-- CreateIndex
CREATE UNIQUE INDEX "product_specs_group_id_sku_key" ON "product_specs"("group_id", "sku");

-- CreateIndex
CREATE INDEX "product_images_group_id_idx" ON "product_images"("group_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

