const ExcelJS = require('exceljs');
const fs = require('fs');

async function analyze() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('C:/Users/RIEP/Desktop/玛仕雷导入数据.xlsx');
  const worksheet = workbook.getWorksheet(1);
  
  console.log('=== 工作表信息 ===');
  console.log('行数:', worksheet.rowCount);
  
  // 产品组分布
  console.log('\n=== 产品组所在行 ===');
  const rowSkuMap = new Map();
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const sku = row.getCell(1).value;
    if (sku) {
      console.log(`  行${rowNumber}: ${sku}`);
      rowSkuMap.set(rowNumber, String(sku));
    }
  });
  
  // 方法1: getImages()
  console.log('\n=== 方法1: worksheet.getImages() ===');
  const images1 = worksheet.getImages ? worksheet.getImages() : [];
  console.log(`找到 ${images1.length} 张图片`);
  images1.forEach(function(img, i) {
    console.log(`  图片${i+1}: type=${img.type}, range=`, img.range, ', imageId=', img.imageId);
  });
  
  // 方法2: 直接访问底层 _images 或 _media
  console.log('\n=== 方法2: 底层属性探查 ===');
  console.log('worksheet._images:', worksheet._images ? worksheet._images.length : 'undefined');
  console.log('worksheet._media:', worksheet._media ? worksheet._media.length : 'undefined');
  console.log('worksheet._drawings:', worksheet._drawings ? worksheet._drawings.length : 'undefined');
  console.log('worksheet._drawingNames:', worksheet._drawingNames ? Object.keys(worksheet._drawingNames) : 'undefined');
  
  if (worksheet._drawings) {
    worksheet._drawings.forEach(function(d, i) {
      console.log(`  drawing ${i}:`, JSON.stringify(d, null, 2).substring(0, 500));
    });
  }
  
  // 方法3: 读取 workbook model
  console.log('\n=== 方法3: workbook model ===');
  const model = workbook.model;
  if (model && model.worksheets) {
    const sheetModel = model.worksheets[0];
    console.log('sheetModel._drawings:', sheetModel._drawings ? sheetModel._drawings.length : 'undefined');
    if (sheetModel._drawings) {
      sheetModel._drawings.forEach(function(d, i) {
        console.log(`  drawing ${i}:`, JSON.stringify(d).substring(0, 500));
      });
    }
  }
  
  // 方法4: 手动解析xlsx（它是zip）
  console.log('\n=== 方法4: 建议 ===');
  console.log('ExcelJS 无法获取浮动图片的行号列号');
  console.log('需要直接解析 xlsx 内部的 drawing 关系');
  console.log('或者让用户把图片嵌入到单元格（非浮动）');
}

analyze().catch(console.error);
