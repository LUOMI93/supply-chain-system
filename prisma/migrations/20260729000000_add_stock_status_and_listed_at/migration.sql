-- AlterTable
ALTER TABLE "product_groups" ADD COLUMN "stock_status" TEXT NOT NULL DEFAULT '现货';
ALTER TABLE "product_groups" ADD COLUMN "listed_at" DATETIME;

-- Backfill existing products so listing-time sorting remains deterministic.
UPDATE "product_groups"
SET "listed_at" = "created_at"
WHERE "listed_at" IS NULL;

-- CreateIndex
CREATE INDEX "product_groups_listed_at_idx" ON "product_groups"("listed_at");
