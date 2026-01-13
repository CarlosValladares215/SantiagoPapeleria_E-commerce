const http = require('http');

const data = JSON.stringify({
    name: 'Loja',
    province: 'Loja',
    distance_km: 0,
    is_custom_rate: false
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/shipping/cities',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
