
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error(
      "Refusing to create default demo users in production. Use `pnpm db:init:prod` with ADMIN_USERNAME and ADMIN_PASSWORD instead."
    );
  }

  console.log("检查并创建测试用户...");

  // 检查现有用户数量
  const userCount = await prisma.user.count();
  console.log(`现有用户数: ${userCount}`);

  // 如果没有用户，创建 admin/editor/viewer
  if (userCount === 0) {
    const adminHash = await bcrypt.hash("admin123", 12);
    const editorHash = await bcrypt.hash("editor123", 12);
    const viewerHash = await bcrypt.hash("viewer123", 12);

    await prisma.user.createMany({
      data: [
        {
          username: "admin",
          displayName: "管理员",
          passwordHash: adminHash,
          role: "admin",
          isActive: true,
        },
        {
          username: "editor",
          displayName: "编辑员",
          passwordHash: editorHash,
          role: "editor",
          isActive: true,
        },
        {
          username: "viewer",
          displayName: "查看者",
          passwordHash: viewerHash,
          role: "viewer",
          isActive: true,
        },
      ],
    });
    console.log("✓ 创建了 3 个测试用户");
  } else {
    console.log("用户已存在，跳过创建");
  }

  // 检查供应商
  const supplierCount = await prisma.supplier.count();
  console.log(`现有供应商数: ${supplierCount}`);

  if (supplierCount === 0) {
    await prisma.supplier.createMany({
      data: [
        { name: "测试供应商A", contact: "张三", remark: "13800000001" },
        { name: "测试供应商B", contact: "李四", remark: "13800000002" },
      ],
    });
    console.log("✓ 创建了 2 个测试供应商");
  } else {
    console.log("供应商已存在，跳过创建");
  }

  const users = await prisma.user.findMany({ select: { username: true, role: true } });
  console.log("\n当前用户列表:", JSON.stringify(users, null, 2));

  const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
  console.log("\n当前供应商列表:", JSON.stringify(suppliers, null, 2));
}

main()
  .catch((e) => {
    console.error("错误:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
