const http = require('http');

// Test with the specific product ID the user showed
const productId = '6965caff41e8a24ccaa3a45d';

http.get(`http://localhost:3000/api/productos/${productId}`, (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        const product = JSON.parse(data);
        console.log('Product:', product.name);
        console.log('peso_kg:', product.peso_kg);
        console.log('weight:', product.weight);
        console.log('Full object peso fields:', JSON.stringify({
            peso_kg: product.peso_kg,
            weight: product.weight
        }, null, 2));
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
