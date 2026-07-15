-- AlterTable
ALTER TABLE "users" ADD COLUMN "failed_login_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "locked_until" DATETIME;
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "password_updated_at" DATETIME;
