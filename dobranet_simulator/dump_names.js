const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'data', 'PRODUCTOS Y PRECIOS.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['REPORTE DE PRODUCTOS'];
const data = XLSX.utils.sheet_to_json(sheet);

console.log(`Analyzing ${data.length} products...`);

let matches = [];
let allNames = [];

data.forEach(row => {
    const name = String(row.NOM || '').trim();
    const upper = name.toUpperCase();
    allNames.push(name);

    if (upper.includes('COLOR') ||
        upper.includes('TEMPERA') ||
        upper.includes('ACUARELA') ||
        upper.includes('PINTURA') ||
        upper.includes('CRAYON') ||
        upper.includes('LAPIZ')) {
        matches.push({
            cod: row.COD,
            nom: name,
            g1: row.G1,
            g2: row.G2,
            g3: row.G3
        });
    }
});

fs.writeFileSync('product_names.txt', allNames.join('\n'));
fs.writeFileSync('subcategory_candidates.json', JSON.stringify(matches, null, 2));

console.log(`Saved ${allNames.length} names to product_names.txt`);
console.log(`Found ${matches.length} candidates for subcategories in subcategory_candidates.json`);
