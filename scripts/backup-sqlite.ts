import { copyFile, mkdir, readdir, rm, stat, writeFile } from "fs/promises";
import path from "path";
import { getUploadRoot } from "../src/lib/uploads";
import {
  copyDirectoryIfExists,
  getBackupRoot,
  getSqlitePath,
  pathExists,
  stamp,
} from "./lib/ops";

async function pruneOldBackups(root: string, keep: number) {
  if (keep <= 0 || !(await pathExists(root))) {
    return;
  }

  const entries = await readdir(root, { withFileTypes: true });
  const backupDirs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(root, entry.name);
    const info = await stat(fullPath);
    backupDirs.push({ fullPath, mtimeMs: info.mtimeMs });
  }

  backupDirs.sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const backup of backupDirs.slice(keep)) {
    await rm(backup.fullPath, { recursive: true, force: true });
    console.log(`Pruned old backup: ${backup.fullPath}`);
  }
}

async function main() {
  const backupRoot = getBackupRoot();
  const backupDir = path.join(backupRoot, stamp());
  await mkdir(backupDir, { recursive: true });

  const dbPath = getSqlitePath();
  const dbTarget = path.join(backupDir, path.basename(dbPath));
  await copyFile(dbPath, dbTarget);

  const uploadRoot = getUploadRoot();
  const uploadsTarget = path.join(backupDir, "uploads");
  const copiedUploads = await copyDirectoryIfExists(uploadRoot, uploadsTarget);

  const manifest = {
    createdAt: new Date().toISOString(),
    databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
    databaseSource: dbPath,
    databaseBackup: dbTarget,
    uploadSource: uploadRoot,
    uploadBackup: copiedUploads ? uploadsTarget : null,
  };
  await writeFile(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const keep = Number.parseInt(process.env.BACKUP_KEEP || "10", 10);
  await pruneOldBackups(backupRoot, Number.isFinite(keep) ? keep : 10);

  console.log(`Backup created: ${backupDir}`);
  console.log(`SQLite database: ${dbTarget}`);
  console.log(copiedUploads ? `Uploads: ${uploadsTarget}` : `Uploads skipped, directory not found: ${uploadRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
