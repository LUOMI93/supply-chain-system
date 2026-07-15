import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { validatePasswordPolicy } from "../src/lib/password-policy";

const prisma = new PrismaClient();

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function assertStrongPassword(password: string) {
  const error = validatePasswordPolicy(password);
  if (error) {
    throw new Error(`ADMIN_PASSWORD is not strong enough: ${error}`);
  }
}

async function main() {
  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || "管理员";
  const password = requireEnv("ADMIN_PASSWORD");
  assertStrongPassword(password);

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "admin", isActive: true },
    select: { username: true },
  });

  if (existingAdmin) {
    console.log(`Active admin user already exists: ${existingAdmin.username}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      displayName,
      role: "admin",
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: false,
      passwordUpdatedAt: new Date(),
    },
    create: {
      username,
      passwordHash,
      displayName,
      role: "admin",
      isActive: true,
      passwordUpdatedAt: new Date(),
    },
  });

  console.log(`Production admin user is ready: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
