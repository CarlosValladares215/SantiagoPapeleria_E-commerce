const http = require('http');

// Fetch the public catalog and check first non-featured product
http.get('http://localhost:3000/api/productos', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const products = JSON.parse(data);
            // Find a product that's NOT a featured one
            const featuredSkus = ['003734', '001281', '012166', '006171', '010552', '002918', '012139', '025620', '010416', '026996'];
            const nonFeatured = products.find(p => !featuredSkus.includes(p.codigo_interno));

            if (nonFeatured) {
                console.log('Product SKU:', nonFeatured.codigo_interno);
                console.log('Multimedia object:', JSON.stringify(nonFeatured.multimedia, null, 2));
            } else {
                console.log('All products are featured?');
                console.log('First product:', JSON.stringify(products[0], null, 2));
            }
        } catch (e) {
            console.log('Parse error:', e.message);
            console.log('Raw (first 500):', data.substring(0, 500));
        }
    });
}).on('error', (err) => {
    console.log('Error:', err.message);
});
