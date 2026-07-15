import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getUploadRoot } from "../src/lib/uploads";
import {
  WEAK_PASSWORDS,
  ensureWritableDirectory,
  getSqlitePath,
  pathExists,
} from "./lib/ops";

const prisma = new PrismaClient();

type Check = {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

const checks: Check[] = [];

function pass(name: string, detail = "ok") {
  checks.push({ name, status: "pass", detail });
}

function warn(name: string, detail: string) {
  checks.push({ name, status: "warn", detail });
}

function fail(name: string, detail: string) {
  checks.push({ name, status: "fail", detail });
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(name, "missing");
    return "";
  }
  pass(name, "set");
  return value;
}

async function checkEnvironment() {
  const authSecret = requireEnv("AUTH_SECRET");
  if (authSecret && authSecret.length < 32) {
    fail("AUTH_SECRET strength", "must be at least 32 characters");
  } else if (authSecret) {
    pass("AUTH_SECRET strength");
  }

  const nextAuthUrl = requireEnv("NEXTAUTH_URL");
  if (nextAuthUrl) {
    try {
      const url = new URL(nextAuthUrl);
      if (url.protocol !== "https:" && process.env.ALLOW_HTTP_PRODUCTION !== "true") {
        warn("NEXTAUTH_URL scheme", "use https in production; set ALLOW_HTTP_PRODUCTION=true only for temporary IP testing");
      } else {
        pass("NEXTAUTH_URL scheme", url.protocol);
      }
    } catch {
      fail("NEXTAUTH_URL format", "invalid URL");
    }
  }

  const trustHost = process.env.AUTH_TRUST_HOST?.trim();
  if (trustHost !== "true") {
    warn("AUTH_TRUST_HOST", "recommended value is true behind Nginx or a public host");
  } else {
    pass("AUTH_TRUST_HOST", "true");
  }

  const databaseUrl = requireEnv("DATABASE_URL");
  if (databaseUrl.startsWith("file:")) {
    const sqlitePath = getSqlitePath();
    if (await pathExists(sqlitePath)) {
      pass("SQLite file", sqlitePath);
    } else {
      warn("SQLite file", `does not exist yet: ${sqlitePath}`);
    }
  } else {
    warn("DATABASE_URL provider", "non-SQLite URLs are not covered by the current backup scripts");
  }

  if ((process.env.STORAGE_PROVIDER || "local") !== "local") {
    warn("STORAGE_PROVIDER", "only local storage is implemented in this deployment path");
  } else {
    pass("STORAGE_PROVIDER", "local");
  }

  try {
    const uploadRoot = getUploadRoot();
    await ensureWritableDirectory(uploadRoot);
    pass("UPLOAD_DIR writable", uploadRoot);
  } catch (error) {
    fail("UPLOAD_DIR writable", error instanceof Error ? error.message : "failed");
  }
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    pass("Database connection");
  } catch (error) {
    fail("Database connection", error instanceof Error ? error.message : "failed");
    return;
  }

  const activeAdminCount = await prisma.user.count({
    where: { role: "admin", isActive: true },
  });
  if (activeAdminCount === 0) {
    fail("Active admin user", "none found; run pnpm db:init:prod");
  } else {
    pass("Active admin user", `${activeAdminCount} found`);
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { username: true, passwordHash: true },
  });
  const weakUsers: string[] = [];
  for (const user of users) {
    for (const password of WEAK_PASSWORDS) {
      if (await bcrypt.compare(password, user.passwordHash)) {
        weakUsers.push(user.username);
        break;
      }
    }
  }

  if (weakUsers.length > 0) {
    fail("Weak active passwords", weakUsers.join(", "));
  } else {
    pass("Weak active passwords", "none detected");
  }
}

async function main() {
  await checkEnvironment();
  await checkDatabase();

  for (const check of checks) {
    const mark = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
    console.log(`[${mark}] ${check.name}: ${check.detail}`);
  }

  const failed = checks.filter((check) => check.status === "fail");
  const warned = checks.filter((check) => check.status === "warn");
  console.log(`\nProduction check complete: ${failed.length} failed, ${warned.length} warnings.`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
