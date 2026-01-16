const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'PRODUCTOS Y PRECIOS.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Try different ranges
console.log('--- Range 5 ---');
console.log(XLSX.utils.sheet_to_json(sheet, { range: 5 })[0]);
