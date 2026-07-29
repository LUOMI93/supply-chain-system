import assert from "assert/strict";
import { execFileSync } from "child_process";
import { copyFile, rm } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../..");
const databasePath = path.join(repoRoot, "prisma", "feature-ui-test.db");
const developmentDatabasePath = path.join(repoRoot, "prisma", "dev.db");
const databaseUrl = "file:./feature-ui-test.db";
const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma");

async function removeTemporaryDatabase() {
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-journal`, { force: true }),
  ]);
}

async function main() {
  await removeTemporaryDatabase();
  if (existsSync(developmentDatabasePath)) {
    await copyFile(developmentDatabasePath, databasePath);
  }
  process.env.DATABASE_URL = databaseUrl;

  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });

  const prisma = new PrismaClient();
  try {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      "PRAGMA table_info(product_groups)"
    );
    const indexes = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
      "PRAGMA index_list(product_groups)"
    );

    assert.ok(columns.some((column) => column.name === "stock_status"));
    assert.ok(columns.some((column) => column.name === "listed_at"));
    assert.ok(indexes.some((index) => index.name === "product_groups_listed_at_idx"));

    const supplier = await prisma.supplier.create({
      data: { name: "迁移测试供应商" },
    });

    await prisma.productGroup.createMany({
      data: [
        {
          sku: "MIGRATION-EARLY",
          supplierId: supplier.id,
          name: "较早上架产品",
          stockStatus: "期货",
          listedAt: new Date("2026-07-01T00:00:00.000Z"),
        },
        {
          sku: "MIGRATION-LATE",
          supplierId: supplier.id,
          name: "较晚上架产品",
          stockStatus: "现货",
          listedAt: new Date("2026-07-02T00:00:00.000Z"),
        },
      ],
    });

    const sorted = await prisma.productGroup.findMany({
      where: { supplierId: supplier.id },
      orderBy: [{ listedAt: "desc" }, { id: "asc" }],
      select: { sku: true, stockStatus: true },
    });

    assert.deepEqual(sorted, [
      { sku: "MIGRATION-LATE", stockStatus: "现货" },
      { sku: "MIGRATION-EARLY", stockStatus: "期货" },
    ]);
    console.log("product migration test passed");
  } finally {
    await prisma.$disconnect();
    await removeTemporaryDatabase();
  }
}

main().catch(async (error) => {
  console.error(error);
  await removeTemporaryDatabase();
  process.exit(1);
});
