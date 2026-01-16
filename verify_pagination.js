const https = require('http');

function testUrl(path, name) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'GET'
    };

    const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            console.log(`\n--- ${name} ---`);
            console.log(`Status: ${res.statusCode}`);
            try {
                const json = JSON.parse(data);
                if (json.meta) {
                    console.log('Meta:', json.meta);
                    console.log('Data Length:', json.data.length);
                    if (json.data.length > 0) {
                        console.log('Sample Item Offer Status:', json.data[0].isOffer);
                    }
                } else {
                    console.log('Status Code:', res.statusCode);
                    console.log('Error Message:', JSON.stringify(json.message));
                }
            } catch (e) {
                console.log('Error parsing JSON:', e.message);
                console.log('Raw:', data.substring(0, 200));
            }
        });
    });

    req.on('error', error => {
        console.error(`Error requesting ${name}:`, error.message);
    });

    req.end();
}

testUrl('/api/productos?page=1&limit=5', 'Products Page 1');
// Delay slightly to avoid interleaving if they were sync (they are not, but let's try to just run one or use callback)
setTimeout(() => {
    testUrl('/api/productos?isOffer=true&page=1&limit=5', 'Offers Page 1');
}, 2000);
