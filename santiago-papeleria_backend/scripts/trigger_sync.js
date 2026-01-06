const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/erp-sync/sync-now',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
};

console.log('Triggering Sync on 127.0.0.1:3000...');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
