const http = require('http');

http.get('http://localhost:3000/api/productos/025620', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const p = JSON.parse(data);
            console.log('Product:', p.nombre || p.erpName);
            console.log('SKU:', p.codigo_interno || p.sku);
            console.log('Multimedia:', JSON.stringify(p.multimedia, null, 2));
            console.log('Images array:', p.images);
        } catch (e) {
            console.log('Raw:', data.substring(0, 300));
        }
    });
}).on('error', (err) => console.log('Error:', err.message));
