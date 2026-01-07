const http = require('http');

const data = JSON.stringify({
    nombre: "DEBUG TEST " + Date.now(),
    tipo: "porcentaje",
    valor: 10,
    ambito: "global",
    fecha_inicio: "2026-01-01T00:00:00.000Z",
    fecha_fin: "2026-12-31T23:59:59.000Z",
    activa: true,
    filtro: {
        categorias: [],
        marcas: [],
        codigos_productos: []
    }
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/promociones',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
