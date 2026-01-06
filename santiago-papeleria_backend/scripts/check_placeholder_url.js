const http = require('http');

// Check a non-featured product (will use default placeholder)
http.get('http://localhost:3000/api/productos?limit=1&skip=20', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const product = json.data ? json.data[0] : json[0];
            console.log('Product SKU:', product?.codigo_interno || product?.sku);
            console.log('Image URL:', product?.multimedia?.principal || product?.images?.[0] || 'NO_IMAGE_FIELD');
        } catch (e) {
            console.log('Response:', data.substring(0, 500));
        }
    });
}).on('error', (err) => {
    console.log('Error:', err.message);
});
