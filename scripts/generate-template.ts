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
      产品组SKU: "",
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
    { col: "产品组SKU", required: "是", desc: "产品组的唯一编号。不同产品必须使用不同产品组SKU；同一产品多个规格时，可每行重复填写此SKU，也可只在第一行填写、后续连续规格行留空" },
    { col: "图片URL", required: "否", desc: "产品图片。支持：1) 网络URL（多张用逗号/分号分隔）；2) 直接复制粘贴图片到单元格；3) 两者混合使用。同一产品多规格时只在第一行填写" },
    { col: "产品名称", required: "是", desc: "产品显示名称。同一产品多个规格时，可每行重复填写，也可只在第一行填写、后续连续规格行留空；同一产品组SKU不能对应多个不同产品名称" },
    { col: "供应商", required: "是", desc: "供应商名称，如不存在会自动创建。同一产品多个规格时，可每行重复填写，也可只在第一行填写、后续连续规格行留空" },
    { col: "产品规格", required: "否", desc: "规格描述文字" },
    { col: "规格SKU", required: "是*", desc: "规格的唯一编号。有多个规格时，每行必须填写" },
    { col: "OE码", required: "否", desc: "原厂配件编号" },
    { col: "拿货价格(元)", required: "否", desc: "进货成本价格（填数字即可）。导入旧表时，列名为“产品价格”或“产品价格(元)”也会识别为拿货价格" },
    { col: "销售价格(元)", required: "否", desc: "对外销售价格（填数字即可）" },
    { col: "适配车型", required: "否", desc: "适用的车型名称" },
    { col: "产品链接", required: "否", desc: "产品来源链接，建议填写 http:// 或 https:// 开头的网址。同一产品多个规格时只在第一行填写；后续连续规格行留空会继承第一行链接" },
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
    { col: "方式3", required: "混合使用", desc: "URL和嵌入图片可同时使用，系统会合并所有图片来源" },
    { col: "注意", required: "多规格", desc: "同一产品有多个规格时，只在第一行填写图片URL或粘贴图片，后续规格行留空即可" },
  ];

  for (let i = 0; i < instructions.length; i++) {
    const row = helpSheet.getRow(i + 2);
    row.values = Object.values(instructions[i]);
    row.font = { name: "微软雅黑", size: 10 };
    row.height = 22;
  }

  // 添加给 AI 使用的填写说明
  const aiSheet = workbook.addWorksheet("AI填写说明", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  aiSheet.columns = [
    { header: "步骤/场景", key: "scenario", width: 22 },
    { header: "AI需要遵守的要求", key: "requirement", width: 78 },
    { header: "常见错误/处理方式", key: "pitfall", width: 58 },
  ];

  const aiHeader = aiSheet.getRow(1);
  aiHeader.font = {
    name: "微软雅黑",
    bold: true,
    size: 11,
    color: { argb: "FFFFFFFF" },
  };
  aiHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244B35" },
  };
  aiHeader.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  aiHeader.height = 28;

  const aiInstructions = [
    {
      scenario: "总体目标",
      requirement: "把任意来源表整理成“导入模板”工作表的列结构。每一行代表一个产品规格；同一产品有多个规格时，使用同一个产品组SKU。只填写能从源数据确认的信息。",
      pitfall: "不要为了凑完整而编造价格、链接、尺寸、重量、适配车型、OE码或图片。源表没有就留空。",
    },
    {
      scenario: "识别源表表头",
      requirement: "源数据表头不一定在第1行，先在前20行寻找类似产品名称、SKU/编号、供应商、规格、价格、车型、链接等字段。合并单元格或空白延续行要按上下文向下填充，但只能在同一产品范围内填充。",
      pitfall: "不要把标题、说明行、合计行、空白分隔行当成产品数据导入。",
    },
    {
      scenario: "产品组SKU",
      requirement: "不同产品必须使用不同产品组SKU；同一产品多个规格必须使用同一个产品组SKU。若源表已有产品组编号则沿用；若只有规格SKU，可为产品组生成稳定编号，例如供应商前缀+连续编号。推荐每个规格行都重复填写产品组SKU，减少歧义。",
      pitfall: "绝不能让同一个产品组SKU对应多个不同产品名称，否则系统会把不同产品合并到一起。",
    },
    {
      scenario: "产品名称",
      requirement: "填写清晰的产品显示名称。同一产品多个规格的产品名称必须完全一致。推荐每个规格行重复填写产品名称；也可以只在同一产品的第一行填写、后续连续规格行留空。",
      pitfall: "不要把规格、车型、颜色等全部塞进产品名称；这些信息优先放入产品规格或适配车型。",
    },
    {
      scenario: "供应商",
      requirement: "供应商为必填。源表有供应商名称时照填；同一产品多规格可每行重复填写。若源表按文件或工作表区分供应商，应把该供应商填入每一行。",
      pitfall: "不要把平台名、店铺链接、联系人误填为供应商，除非源数据明确它就是供应商名称。",
    },
    {
      scenario: "规格与规格SKU",
      requirement: "每个规格占一行。规格SKU每行必须填写，优先使用源表规格SKU/商品编号/工厂编号；如果缺失，可基于产品组SKU生成唯一规格SKU，例如 ZFLM-00001-01、ZFLM-00001-02。产品规格填写颜色、左右、型号、针脚、版本等规格差异。",
      pitfall: "同一产品组下规格SKU不能重复。不要把多个规格写在同一个单元格里。",
    },
    {
      scenario: "价格字段",
      requirement: "源表中的拿货价、成本价、采购价、产品价格通常填入“拿货价格(元)”；销售价、零售价、对外价填入“销售价格(元)”。尽量只填数字或简单文本，保留小数。",
      pitfall: "不要把区间价、批发阶梯价随意取平均；无法确定单价时可留空或保留源文本说明。",
    },
    {
      scenario: "OE码和适配车型",
      requirement: "OE码填原厂编号，可多个编号用逗号、分号或换行分隔。适配车型填品牌、车型、年份、底盘代号等可读信息。",
      pitfall: "不要把OE码写进适配车型，也不要删除前导0或特殊字符。",
    },
    {
      scenario: "产品链接",
      requirement: "产品链接填写来源商品页，建议为 http:// 或 https:// 开头的网址。同一产品多规格通常只在第一行填写；也可以每个规格行重复填写相同链接。",
      pitfall: "不要把普通英文标题、搜索词或图片链接填入产品链接。没有明确来源链接就留空。",
    },
    {
      scenario: "图片URL",
      requirement: "图片URL只填写可直接访问的图片地址，支持多张图片用逗号、分号或换行分隔。若源表有嵌入图片，可保留图片在对应产品第一行附近；同一产品多规格只在第一行放图片或图片URL。",
      pitfall: "不要把商品详情页链接填入图片URL。WPS的 =DISPIMG() 公式不等于真实图片URL，不能当URL填写。",
    },
    {
      scenario: "重量、尺寸、装箱数",
      requirement: "产品重量/尺寸表示单品信息；包装重量/尺寸表示含包装信息；装箱数表示每箱数量。单位可保留在文本中，例如 13kg、70*40*60。",
      pitfall: "不要把包装重量写到产品重量里；无法判断单品还是包装时保留源表原文并尽量放到更接近的列。",
    },
    {
      scenario: "备注",
      requirement: "备注只放无法归类但对人工复核有用的信息，例如源表注释、特殊条件、需确认事项。",
      pitfall: "不要把必填字段缺失原因藏在备注里；产品组SKU、产品名称、供应商、规格SKU仍应按规则填写。",
    },
    {
      scenario: "数据类型",
      requirement: "SKU、OE码、链接、尺寸等按文本处理；价格可填数字。复制公式单元格时使用显示结果，不要写入Excel公式。保留前导0、横线、斜杠、括号等编号字符。",
      pitfall: "不要让Excel自动把长编号转科学计数法，或把 00123 变成 123。",
    },
    {
      scenario: "导入前自检",
      requirement: "检查四件事：1) 每行有规格SKU；2) 每个产品组SKU只对应一个产品名称；3) 不同产品没有复用同一产品组SKU；4) 图片URL与产品链接没有混填。",
      pitfall: "发现源数据疑似串行、合并单元格错位或产品边界不清时，宁可留空或标注待确认，不要强行合并。",
    },
  ];

  for (let i = 0; i < aiInstructions.length; i++) {
    const row = aiSheet.getRow(i + 2);
    row.values = Object.values(aiInstructions[i]);
    row.font = { name: "微软雅黑", size: 10 };
    row.alignment = { vertical: "top", wrapText: true };
    row.height = 56;
    if (i % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF5F8F5" },
      };
    }
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
