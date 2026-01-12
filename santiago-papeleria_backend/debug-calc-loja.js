const http = require('http');

const data = JSON.stringify({
    province: 'Loja',
    weight: 1.35
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/shipping/calculate',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${body}`);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
