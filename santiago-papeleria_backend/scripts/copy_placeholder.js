const fs = require('fs');

const src = 'C:\\Users\\vcarl\\.gemini\\antigravity\\brain\\c358e4a8-c939-47f7-981d-0a1d77fc81af\\uploaded_image_1767568571497.png';
const dest1 = 'c:\\Users\\vcarl\\Documents\\E-Commerce Santiago Papeleria\\dobranet_simulator\\data\\photos\\product-placeholder.png';
const dest2 = 'c:\\Users\\vcarl\\Documents\\E-Commerce Santiago Papeleria\\santiago_papeleria_frontend\\src\\assets\\images\\product-placeholder.png';

console.log('Source size:', fs.statSync(src).size, 'bytes');

fs.copyFileSync(src, dest1);
console.log('Copied to Simulator:', fs.statSync(dest1).size, 'bytes');

fs.copyFileSync(src, dest2);
console.log('Copied to Frontend:', fs.statSync(dest2).size, 'bytes');

console.log('Done!');
