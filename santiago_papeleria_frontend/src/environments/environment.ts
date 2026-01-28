
// Si usas Dev Tunnels, pega tu URL aquí. Si no, déjalo vacío string vacía ''.
const TUNNEL_URL = ''//'https://78q1252s-3001.use2.devtunnels.ms';

const PORT = 3001;
const HOST = 'localhost';
const PROTOCOL = 'http';

// Si TUNNEL_URL tiene valor, úsalo. Si no, usa localhost.
const BASE_API = TUNNEL_URL ? `${TUNNEL_URL}/api` : `${PROTOCOL}://${HOST}:${PORT}/api`;

export const environment = {
    production: false,
    baseApiUrl: BASE_API, // Localhost
    apiUrl: `${BASE_API}/productos`,
    // baseApiUrl: 'http://10.19.73.153:3000/api', // Deprecated: Old IP
    // apiUrl: 'http://10.19.73.153:3000/api/productos'
};