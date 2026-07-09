import { mkdir, rm, stat, writeFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
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

export function loadDotEnvIfPresent(envPath = path.resolve(process.cwd(), ".env")) {
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = parseEnvValue(line.slice(equalsIndex + 1).trim());
  }
}

function parseEnvValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
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
