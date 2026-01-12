const http = require('http');

const zoneId = '69643f4da9984e488b4cd6b5'; // Avenida Ivan

const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/shipping/zones/${zoneId}/rates`,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('Fetching rates for zone:', zoneId);

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('RATES RESPONSE:');
        console.log(data);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
