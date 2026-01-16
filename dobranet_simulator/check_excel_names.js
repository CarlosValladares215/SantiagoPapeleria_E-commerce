const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'PRODUCTOS Y PRECIOS.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { range: 6 }); // Adjusted range based on previous checks

console.log(`Scanning ${data.length} rows for "COLORES" related terms...`);

let count = 0;
data.forEach(row => {
    const name = (row['NOM'] || '').toUpperCase();
    if (name.includes('COLOR') || name.includes('LAPIZ DE PINTAR')) {
        console.log(`Found: [${row['COD']}] ${name}`);
        count++;
    }
});

if (count === 0) {
    console.log('No products found matching "COLOR" or "LAPIZ DE PINTAR".');
}
