import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ========== 1. 创建用户 ==========
  const adminHash = await bcrypt.hash("admin123", 12);
  const editorHash = await bcrypt.hash("editor123", 12);
  const viewerHash = await bcrypt.hash("viewer123", 12);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash: adminHash },
    create: {
      username: "admin",
      passwordHash: adminHash,
      displayName: "管理员",
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { username: "editor" },
    update: { passwordHash: editorHash },
    create: {
      username: "editor",
      passwordHash: editorHash,
      displayName: "编辑者",
      role: "editor",
    },
  });

  await prisma.user.upsert({
    where: { username: "viewer" },
    update: { passwordHash: viewerHash },
    create: {
      username: "viewer",
      passwordHash: viewerHash,
      displayName: "查看者",
      role: "viewer",
    },
  });

  console.log("✅ 用户已创建");

  // ========== 2. 创建供应商 ==========
  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { name: "博世汽车配件" },
      update: {},
      create: {
        name: "博世汽车配件",
        contact: "张经理 13800138001",
        remark: "全球知名汽车零部件供应商，品质可靠",
      },
    }),
    prisma.supplier.upsert({
      where: { name: "广州汽配城A区" },
      update: {},
      create: {
        name: "广州汽配城A区",
        contact: "李老板 13900139002",
        remark: "华南地区大型汽配批发商，品种齐全",
      },
    }),
    prisma.supplier.upsert({
      where: { name: "德力西电气" },
      update: {},
      create: {
        name: "德力西电气",
        contact: "王工 13700137003",
        remark: "电气配件专业供应商",
      },
    }),
    prisma.supplier.upsert({
      where: { name: "温州瑞安汽摩配" },
      update: {},
      create: {
        name: "温州瑞安汽摩配",
        contact: "陈总 13600136004",
        remark: "摩托车配件及改装件供应商",
      },
    }),
  ]);

  console.log(`✅ ${suppliers.length} 家供应商已创建`);

  // ========== 3. 创建产品组及规格 ==========

  // --- 产品1: 刹车片 ---
  const brakePad = await prisma.productGroup.upsert({
    where: { sku: "BP-001" },
    update: {},
    create: {
      sku: "BP-001",
      supplierId: suppliers[0].id,
      name: "陶瓷刹车片 前轮套装",
      productLink: "https://example.com/brake-pad-001",
      productWeight: "1.8kg",
      productSize: "150×80×18mm",
      packageSize: "200×120×50mm",
      packageWeight: "2.0kg",
      boxQuantity: "10套/箱",
      remark: "适配大众迈腾/帕萨特 2018-2023款",
      specs: {
        create: [
          {
            sku: "BP-001-A",
            factoryCode: "BS-8866",
            spec: "前轮陶瓷片 标准型",
            costPrice: "85.00",
            salePrice: "168.00",
            carModel: "大众迈腾 2018-2023",
            oeCode: "5Q0698151A",
          },
          {
            sku: "BP-001-B",
            factoryCode: "BS-8866H",
            spec: "前轮陶瓷片 高性能型",
            costPrice: "120.00",
            salePrice: "238.00",
            carModel: "大众迈腾 2018-2023",
            oeCode: "5Q0698151B",
          },
        ],
      },
    },
  });

  // --- 产品2: 机油滤清器 ---
  const oilFilter = await prisma.productGroup.upsert({
    where: { sku: "OF-002" },
    update: {},
    create: {
      sku: "OF-002",
      supplierId: suppliers[0].id,
      name: "机油滤清器 高效型",
      productLink: "https://example.com/oil-filter-002",
      productWeight: "0.35kg",
      productSize: "φ80×100mm",
      packageSize: "120×120×150mm",
      packageWeight: "0.42kg",
      boxQuantity: "50个/箱",
      remark: "适配丰田凯美瑞/RAV4 2019-2024款",
      specs: {
        create: [
          {
            sku: "OF-002-A",
            factoryCode: "BS-9901",
            spec: "标准过滤精度 30μm",
            costPrice: "22.00",
            salePrice: "45.00",
            carModel: "丰田凯美瑞 2019-2024",
            oeCode: "04152-YZZA1",
          },
          {
            sku: "OF-002-B",
            factoryCode: "BS-9901P",
            spec: "高效过滤精度 15μm",
            costPrice: "35.00",
            salePrice: "68.00",
            carModel: "丰田凯美瑞 2019-2024 / RAV4 2020-2024",
            oeCode: "04152-YZZA5",
          },
          {
            sku: "OF-002-C",
            factoryCode: "BS-9901R",
            spec: "长效型 15000km",
            costPrice: "48.00",
            salePrice: "98.00",
            carModel: "丰田凯美瑞 2019-2024 / RAV4 2020-2024",
            oeCode: "04152-YZZA8",
          },
        ],
      },
    },
  });

  // --- 产品3: LED大灯 ---
  const ledHeadlight = await prisma.productGroup.upsert({
    where: { sku: "LED-003" },
    update: {},
    create: {
      sku: "LED-003",
      supplierId: suppliers[1].id,
      name: "LED大灯 H7 超亮型",
      productLink: "https://example.com/led-headlight-003",
      productWeight: "0.25kg",
      productSize: "120×55×55mm",
      packageSize: "180×120×80mm",
      packageWeight: "0.35kg",
      boxQuantity: "20对/箱",
      remark: "6000K白光，带散热风扇，即插即用",
      specs: {
        create: [
          {
            sku: "LED-003-35W",
            factoryCode: "GZ-LH735",
            spec: "35W 3200LM H7接口",
            costPrice: "28.00",
            salePrice: "58.00",
            carModel: "通用型 H7接口",
            oeCode: "N/A",
          },
          {
            sku: "LED-003-55W",
            factoryCode: "GZ-LH755",
            spec: "55W 5500LM H7接口",
            costPrice: "45.00",
            salePrice: "98.00",
            carModel: "通用型 H7接口",
            oeCode: "N/A",
          },
        ],
      },
    },
  });

  // --- 产品4: 火花塞 ---
  const sparkPlug = await prisma.productGroup.upsert({
    where: { sku: "SP-004" },
    update: {},
    create: {
      sku: "SP-004",
      supplierId: suppliers[1].id,
      name: "铱金火花塞 高性能型",
      productWeight: "0.05kg",
      productSize: "φ14×85mm",
      packageSize: "100×80×25mm",
      packageWeight: "0.08kg",
      boxQuantity: "100支/箱",
      remark: "铱金电极，寿命10万公里，需提前3天订货",
      specs: {
        create: [
          {
            sku: "SP-004-I",
            factoryCode: "GZ-SPI14",
            spec: "铱金 φ14 热值6",
            costPrice: "18.00",
            salePrice: "38.00",
            carModel: "本田思域 2016-2023 / 雅阁 2018-2023",
            oeCode: "12290-R70-A01",
          },
          {
            sku: "SP-004-DI",
            factoryCode: "GZ-SPD14",
            spec: "双铱金 φ14 热值7",
            costPrice: "28.00",
            salePrice: "58.00",
            carModel: "本田思域 2016-2023 / 雅阁 2018-2023",
            oeCode: "12290-5A2-A01",
          },
        ],
      },
    },
  });

  // --- 产品5: 雨刮器 ---
  const wiper = await prisma.productGroup.upsert({
    where: { sku: "WB-005" },
    update: {},
    create: {
      sku: "WB-005",
      supplierId: suppliers[1].id,
      name: "无骨雨刮器 对装",
      productWeight: "0.4kg",
      productSize: "650mm+400mm",
      packageSize: "700×100×40mm",
      packageWeight: "0.5kg",
      boxQuantity: "30对/箱",
      remark: "硅胶材质，静音耐磨",
      specs: {
        create: [
          {
            sku: "WB-005-24+16",
            factoryCode: "GZ-WB2416",
            spec: "24寸+16寸 通用U型接口",
            costPrice: "12.00",
            salePrice: "29.00",
            carModel: "通用型 U型接口",
            oeCode: "N/A",
          },
          {
            sku: "WB-005-26+16",
            factoryCode: "GZ-WB2616",
            spec: "26寸+16寸 通用U型接口",
            costPrice: "15.00",
            salePrice: "35.00",
            carModel: "通用型 U型接口",
            oeCode: "N/A",
          },
        ],
      },
    },
  });

  // --- 产品6: 继电器 ---
  const relay = await prisma.productGroup.upsert({
    where: { sku: "RL-006" },
    update: {},
    create: {
      sku: "RL-006",
      supplierId: suppliers[2].id,
      name: "汽车继电器 12V 40A",
      productWeight: "0.03kg",
      productSize: "28×28×25mm",
      packageSize: "50×50×30mm",
      packageWeight: "0.04kg",
      boxQuantity: "200个/箱",
      remark: "5脚常开型，带插座，适合改装",
      specs: {
        create: [
          {
            sku: "RL-006-5P",
            factoryCode: "DLX-JD5-12V",
            spec: "5脚 12V/40A 常开型",
            costPrice: "3.50",
            salePrice: "8.00",
            carModel: "通用型 12V车型",
            oeCode: "N/A",
          },
          {
            sku: "RL-006-4P",
            factoryCode: "DLX-JD4-12V",
            spec: "4脚 12V/40A 常开型",
            costPrice: "3.00",
            salePrice: "7.00",
            carModel: "通用型 12V车型",
            oeCode: "N/A",
          },
        ],
      },
    },
  });

  // --- 产品7: 摩托车链条 ---
  const chain = await prisma.productGroup.upsert({
    where: { sku: "MC-007" },
    update: {},
    create: {
      sku: "MC-007",
      supplierId: suppliers[3].id,
      name: "摩托车油封链条 428H",
      productWeight: "1.5kg",
      productSize: "428H-132节",
      packageSize: "200×150×50mm",
      packageWeight: "1.65kg",
      boxQuantity: "10条/箱",
      remark: "加厚油封，高耐磨，适合125-250cc车型",
      specs: {
        create: [
          {
            sku: "MC-007-428H",
            factoryCode: "WZ-428H-132",
            spec: "428H 132节 金色",
            costPrice: "35.00",
            salePrice: "78.00",
            carModel: "本田CB190 / 春风250NK",
            oeCode: "N/A",
          },
          {
            sku: "MC-007-520",
            factoryCode: "WZ-520-120",
            spec: "520 120节 金色",
            costPrice: "55.00",
            salePrice: "128.00",
            carModel: "川崎Ninja400 / 春风450SR",
            oeCode: "N/A",
          },
        ],
      },
    },
  });

  // --- 产品8: 空气滤清器 ---
  const airFilter = await prisma.productGroup.upsert({
    where: { sku: "AF-008" },
    update: {},
    create: {
      sku: "AF-008",
      supplierId: suppliers[0].id,
      name: "空气滤清器 高流量型",
      productWeight: "0.5kg",
      productSize: "280×200×50mm",
      packageSize: "300×220×60mm",
      packageWeight: "0.6kg",
      boxQuantity: "20个/箱",
      remark: "湿式高流量滤芯，可清洗重复使用",
      specs: {
        create: [
          {
            sku: "AF-008-S",
            factoryCode: "BS-AF201",
            spec: "标准型 纸滤",
            costPrice: "15.00",
            salePrice: "35.00",
            carModel: "大众速腾 2019-2024 / 高尔夫8",
            oeCode: "5Q0129620",
          },
          {
            sku: "AF-008-H",
            factoryCode: "BS-AF201H",
            spec: "高流量型 棉质湿式",
            costPrice: "35.00",
            salePrice: "78.00",
            carModel: "大众速腾 2019-2024 / 高尔夫8",
            oeCode: "5Q0129620B",
          },
        ],
      },
    },
  });

  console.log("✅ 8 个产品组及 17 个规格已创建");

  // ========== 汇总 ==========
  console.log("\n📋 数据汇总:");
  console.log("  👤 用户: admin/admin123, editor/editor123, viewer/viewer123");
  console.log("  🏭 供应商: 4 家");
  console.log("  📦 产品组: 8 个");
  console.log("  📐 产品规格: 17 个");
  console.log("\n✨ 种子数据生成完毕！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
