import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import assert from "assert/strict";
import { loadDotEnvIfPresent } from "./ops";

async function main() {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "ops-env-"));
  const originalCwd = process.cwd();
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousUploadDir = process.env.UPLOAD_DIR;

  try {
    await mkdir(tempRoot, { recursive: true });
    await writeFile(
      path.join(tempRoot, ".env"),
      [
        "DATABASE_URL=file:/tmp/prod.db",
        "UPLOAD_DIR=/tmp/uploads",
        "EMPTY_VALUE=",
        "# comment",
      ].join("\n")
    );

    delete process.env.DATABASE_URL;
    process.env.UPLOAD_DIR = "/already-set";
    process.chdir(tempRoot);

    loadDotEnvIfPresent();

    assert.equal(process.env.DATABASE_URL, "file:/tmp/prod.db");
    assert.equal(process.env.UPLOAD_DIR, "/already-set");
    assert.equal(process.env.EMPTY_VALUE, "");
    console.log("ops env test passed");
  } finally {
    process.chdir(originalCwd);
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    if (previousUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = previousUploadDir;
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
