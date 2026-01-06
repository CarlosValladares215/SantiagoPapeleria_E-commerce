const http = require('http');

http.get('http://localhost:3000/api/productos/003734', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Image URL:', json.multimedia?.principal);
        } catch (e) {
            console.log('Error parsing JSON:', e.message);
        }
    });
}).on('error', (err) => {
    console.log('Error:', err.message);
});
