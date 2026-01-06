const fs = require('fs');
const path = require('path');

// Minimal PNG (1x1 gray pixel)
// Signature (8) + IHDR (25) + IDAT (12) + IEND (12) = 57 bytes
// This is a 1x1 pixel #CCCCCC (light gray)
const buffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // Signature
    0x00, 0x00, 0x00, 0x0d, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR chunk type
    0x00, 0x00, 0x00, 0x01, // Width: 1
    0x00, 0x00, 0x00, 0x01, // Height: 1
    0x08, 0x02, 0x00, 0x00, 0x00, // Bit depth, Color type, Compression, Filter, Interlace
    0x90, 0x77, 0x53, 0xde, // CRC
    0x00, 0x00, 0x00, 0x0c, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT chunk type
    0x08, 0xd7, 0x63, 0xf0, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, // Compressed data (gray pixel)
    0x0e, 0x7c, 0x3d, 0x52, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4e, 0x44, // IEND chunk type
    0xae, 0x42, 0x60, 0x82  // CRC
]);

const simPath = 'c:\\Users\\vcarl\\Documents\\E-Commerce Santiago Papeleria\\dobranet_simulator\\data\\photos\\placeholder.png';
const frontPath = 'c:\\Users\\vcarl\\Documents\\E-Commerce Santiago Papeleria\\santiago_papeleria_frontend\\src\\assets\\images\\placeholder.png';

console.log('Replacing placeholder in Simulator...');
fs.writeFileSync(simPath, buffer);

console.log('Replacing placeholder in Frontend...');
fs.writeFileSync(frontPath, buffer);

console.log('Done. Created generic gray placeholder.');
