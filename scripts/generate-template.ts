import ExcelJS from "exceljs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "供应链管理系统";

  const sheet = workbook.addWorksheet("导入模板", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // 定义列 — 与网页表格显示列顺序完全一致
  // 网页顺序: 产品组SKU → 图片 → 产品名称 → 供应商 → 产品规格 → 规格SKU → OE码 → 拿货价格(元) → 销售价格(元) → 适配车型 → 产品链接 → 产品重量 → 产品尺寸 → 包装重量 → 包装尺寸 → 装箱数 → 备注
  const columns = [
    { header: "产品组SKU", key: "产品组SKU", width: 14 },
    { header: "图片URL", key: "图片URL", width: 40 },
    { header: "产品名称", key: "产品名称", width: 26 },
    { header: "供应商", key: "供应商", width: 16 },
    { header: "产品规格", key: "产品规格", width: 20 },
    { header: "规格SKU", key: "规格SKU", width: 14 },
    { header: "OE码", key: "OE码", width: 18 },
    { header: "拿货价格(元)", key: "拿货价格(元)", width: 14 },
    { header: "销售价格(元)", key: "销售价格(元)", width: 14 },
    { header: "适配车型", key: "适配车型", width: 26 },
    { header: "产品链接", key: "产品链接", width: 30 },
    { header: "产品重量", key: "产品重量", width: 12 },
    { header: "产品尺寸", key: "产品尺寸", width: 16 },
    { header: "包装重量", key: "包装重量", width: 12 },
    { header: "包装尺寸", key: "包装尺寸", width: 16 },
    { header: "装箱数", key: "装箱数", width: 12 },
    { header: "备注", key: "备注", width: 28 },
  ];

  sheet.columns = columns;

  // 表头样式
  const headerRow = sheet.getRow(1);
  headerRow.font = {
    name: "微软雅黑",
    bold: true,
    size: 11,
    color: { argb: "FFFFFFFF" },
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244B35" },
  };
  headerRow.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  headerRow.height = 28;

  // 高亮图片URL列表头（橙色底）
  const imageHeaderCell = sheet.getCell(1, 2); // B列
  imageHeaderCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFB45309" },
  };
  imageHeaderCell.note = {
    texts: [
      { font: { name: "微软雅黑", size: 10, bold: true }, text: "📷 图片URL列说明\n\n" },
      { font: { name: "微软雅黑", size: 9 }, text: "支持三种方式导入图片：\n\n" },
      { font: { name: "微软雅黑", size: 9, bold: true }, text: "1. 网络URL：\n" },
      { font: { name: "微软雅黑", size: 9 }, text: '  直接填写图片网址，如 https://example.com/img.jpg\n  多张图片用逗号或分号分隔\n\n' },
      { font: { name: "微软雅黑", size: 9, bold: true }, text: "2. 粘贴图片到Excel单元格：\n" },
      { font: { name: "微软雅黑", size: 9 }, text: "  右键复制图片 → 在单元格中粘贴\n  系统会自动提取该行所有嵌入图片\n\n" },
      { font: { name: "微软雅黑", size: 9, bold: true }, text: "3. URL + 嵌入图片混合：\n" },
      { font: { name: "微软雅黑", size: 9 }, text: "  两种方式可同时使用，会自动合并\n\n" },
      { font: { name: "微软雅黑", size: 9, color: { argb: "FFDC2626" } }, text: "⚠ 同一产品多规格时，只在第一行填写图片" },
    ],
  };

  // 示例数据 — 顺序与 columns 完全一致
  const examples = [
    {
      产品组SKU: "DEMO-001",
      图片URL: "https://picsum.photos/400/300?random=1; https://picsum.photos/400/300?random=2",
      产品名称: "【示例】陶瓷刹车片 前轮套装",
      供应商: "博世汽车配件",
      产品规格: "前轮陶瓷片 标准型",
      规格SKU: "BS-8866",
      OE码: "5Q0698151A",
      "拿货价格(元)": 85,
      "销售价格(元)": 168,
      适配车型: "大众迈腾 2018-2023",
      产品链接: "https://example.com/brake-pad",
      产品重量: "1.8kg",
      产品尺寸: "150×80×18mm",
      包装重量: "2.0kg",
      包装尺寸: "200×120×50mm",
      装箱数: "10套/箱",
      备注: "适配大众迈腾 2018-2023款",
    },
    {
      产品组SKU: "DEMO-001",
      图片URL: "",
      产品名称: "",
      供应商: "",
      产品规格: "前轮陶瓷片 高性能型",
      规格SKU: "BS-8866H",
      OE码: "5Q0698151B",
      "拿货价格(元)": 120,
      "销售价格(元)": 238,
      适配车型: "大众迈腾 2018-2023",
      产品链接: "",
      产品重量: "",
      产品尺寸: "",
      包装重量: "",
      包装尺寸: "",
      装箱数: "",
      备注: "",
    },
    {
      产品组SKU: "DEMO-002",
      图片URL: "https://picsum.photos/400/300?random=3",
      产品名称: "【示例】机油滤清器 高效型",
      供应商: "广州汽配城A区",
      产品规格: "标准过滤精度 30μm",
      规格SKU: "BS-9901",
      OE码: "04152-YZZA1",
      "拿货价格(元)": 22,
      "销售价格(元)": 45,
      适配车型: "丰田凯美瑞 2019-2024",
      产品链接: "",
      产品重量: "0.35kg",
      产品尺寸: "φ80×100mm",
      包装重量: "0.42kg",
      包装尺寸: "120×120×150mm",
      装箱数: "50个/箱",
      备注: "适配丰田凯美瑞 2019-2024款",
    },
  ];

  // 填充示例数据
  for (let i = 0; i < examples.length; i++) {
    const row = sheet.getRow(i + 2);
    row.values = Object.values(examples[i]);
    row.font = { name: "微软雅黑", size: 10 };
    row.alignment = { vertical: "middle", wrapText: true };
    row.height = 22;

    if (i % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F8F5" },
      };
    }
  }

  // 添加说明工作表
  const helpSheet = workbook.addWorksheet("填写说明");
  helpSheet.columns = [
    { header: "列名", key: "col", width: 16 },
    { header: "必填", key: "required", width: 8 },
    { header: "说明", key: "desc", width: 60 },
  ];

  const helpHeader = helpSheet.getRow(1);
  helpHeader.font = {
    name: "微软雅黑",
    bold: true,
    size: 11,
    color: { argb: "FFFFFFFF" },
  };
  helpHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244B35" },
  };

  const instructions = [
    { col: "产品组SKU", required: "是", desc: "产品组的唯一编号，同一产品多个规格时请重复填写此SKU" },
    { col: "图片URL", required: "否", desc: "产品图片。支持：1) 网络URL（多张用逗号/分号分隔）；2) 直接复制粘贴图片到单元格；3) 两者混合使用。同一产品多规格时只在第一行填写" },
    { col: "产品名称", required: "是", desc: "产品显示名称（同一产品多规格时只在第一行填写）" },
    { col: "供应商", required: "是", desc: "供应商名称，如不存在会自动创建" },
    { col: "产品规格", required: "否", desc: "规格描述文字" },
    { col: "规格SKU", required: "是*", desc: "规格的唯一编号。有多个规格时，每行必须填写" },
    { col: "OE码", required: "否", desc: "原厂配件编号" },
    { col: "拿货价格(元)", required: "否", desc: "进货成本价格（填数字即可）" },
    { col: "销售价格(元)", required: "否", desc: "对外销售价格（填数字即可）" },
    { col: "适配车型", required: "否", desc: "适用的车型名称" },
    { col: "产品链接", required: "否", desc: "产品来源链接（网址）" },
    { col: "产品重量", required: "否", desc: "单个产品净重" },
    { col: "产品尺寸", required: "否", desc: "产品外观尺寸" },
    { col: "包装重量", required: "否", desc: "含包装的总重量" },
    { col: "包装尺寸", required: "否", desc: "包装后的尺寸" },
    { col: "装箱数", required: "否", desc: "每箱装多少个" },
    { col: "备注", required: "否", desc: "额外说明信息" },
    // 额外说明
    { col: "---", required: "---", desc: "--- 图片导入详细说明 ---" },
    { col: "方式1", required: "网络URL", desc: '在"图片URL"列直接粘贴图片网址，多张图片用逗号(,)或分号(;)分隔。系统会自动下载保存' },
    { col: "方式2", required: "粘贴图片", desc: '在Excel中右键复制图片 → 选中"图片URL"列对应单元格 → 粘贴。导入时会自动提取该行的嵌入图片' },
    { col: "方式3", required: "混合使用", desc: "URL和嵌入图片可同时使用，系统会合并所有图片来源。最多20张" },
    { col: "注意", required: "多规格", desc: "同一产品有多个规格时，只在第一行填写图片URL或粘贴图片，后续规格行留空即可" },
  ];

  for (let i = 0; i < instructions.length; i++) {
    const row = helpSheet.getRow(i + 2);
    row.values = Object.values(instructions[i]);
    row.font = { name: "微软雅黑", size: 10 };
    row.height = 22;
  }

  // 保存
  const publicDir = path.resolve(__dirname, "../public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const filePath = path.join(publicDir, "导入模板.xlsx");
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ 导入模板已生成: ${filePath}`);
}

generateTemplate().catch(console.error);
