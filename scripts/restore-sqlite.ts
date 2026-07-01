import { copyFile, mkdir, readdir, rm, stat } from "fs/promises";
import path from "path";
import { getUploadRoot } from "../src/lib/uploads";
import {
  fsCp,
  getBackupRoot,
  getSqlitePath,
  pathExists,
  stamp,
} from "./lib/ops";

async function findDatabaseFile(backupPath: string) {
  const info = await stat(backupPath);
  if (info.isFile()) {
    return backupPath;
  }

  const entries = await readdir(backupPath, { withFileTypes: true });
  const dbFile = entries.find((entry) => entry.isFile() && entry.name.endsWith(".db"));
  if (!dbFile) {
    throw new Error(`No .db file found in backup directory: ${backupPath}`);
  }
  return path.join(backupPath, dbFile.name);
}

async function backupCurrentDatabase(target: string) {
  if (!(await pathExists(target))) {
    return null;
  }

  const restoreBackupRoot = path.join(getBackupRoot(), `pre-restore-${stamp()}`);
  await mkdir(restoreBackupRoot, { recursive: true });
  const safeCopy = path.join(restoreBackupRoot, path.basename(target));
  await copyFile(target, safeCopy);
  return safeCopy;
}

async function main() {
  const rawBackupPath = process.env.BACKUP_PATH?.trim() || process.env.BACKUP_FILE?.trim();
  if (!rawBackupPath) {
    throw new Error("Set BACKUP_PATH to a backup directory, or BACKUP_FILE to a SQLite .db file.");
  }

  const backupPath = path.resolve(process.cwd(), rawBackupPath);
  const sourceDb = await findDatabaseFile(backupPath);
  const targetDb = getSqlitePath();

  const safetyCopy = await backupCurrentDatabase(targetDb);
  await mkdir(path.dirname(targetDb), { recursive: true });
  await copyFile(sourceDb, targetDb);

  const shouldRestoreUploads = process.env.RESTORE_UPLOADS !== "false";
  if (shouldRestoreUploads) {
    const sourceUploads = path.join(backupPath, "uploads");
    const targetUploads = getUploadRoot();
    if (await pathExists(sourceUploads)) {
      await rm(targetUploads, { recursive: true, force: true });
      await fsCp(sourceUploads, targetUploads);
      console.log(`Uploads restored from ${sourceUploads} to ${targetUploads}`);
    } else {
      console.log(`Uploads restore skipped, no uploads directory found in ${backupPath}`);
    }
  }

  console.log(`SQLite database restored from ${sourceDb} to ${targetDb}`);
  if (safetyCopy) {
    console.log(`Pre-restore database copy saved to ${safetyCopy}`);
  }
  console.log("Restart the application after restoring the database.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
