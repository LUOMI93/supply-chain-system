import { mkdir, rm, stat, writeFile } from "fs/promises";
import path from "path";

export const WEAK_PASSWORDS = [
  "admin",
  "admin123",
  "password",
  "password123",
  "123456",
  "12345678",
  "editor123",
  "viewer123",
];

export function getSqlitePath() {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("This command only supports DATABASE_URL values that start with file:");
  }

  const rawPath = databaseUrl.slice("file:".length);
  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), "prisma", rawPath);
}

export function getBackupRoot() {
  return path.resolve(process.cwd(), process.env.BACKUP_DIR || "backups");
}

export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function pathExists(target: string) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

export async function ensureWritableDirectory(dir: string) {
  await mkdir(dir, { recursive: true });
  const probe = path.join(dir, `.write-test-${process.pid}-${Date.now()}`);
  await writeFile(probe, "ok");
  await rm(probe, { force: true });
}

export async function copyDirectoryIfExists(source: string, target: string) {
  if (!(await pathExists(source))) {
    return false;
  }

  await mkdir(path.dirname(target), { recursive: true });
  await rm(target, { recursive: true, force: true });
  await fsCp(source, target);
  return true;
}

export async function fsCp(source: string, target: string) {
  const fs = await import("fs/promises");
  await fs.cp(source, target, {
    recursive: true,
    force: true,
    errorOnExist: false,
  });
}
