const mongoose = require('mongoose');

// Default URI from default env
const uri = 'mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority';

async function check() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const erpSchema = new mongoose.Schema({ codigo: String, imagen: String, galeria_erp: [String] }, { collection: 'productos_erp' });
        const ErpModel = mongoose.model('ProductERP', erpSchema);

        const prodSchema = new mongoose.Schema({ codigo_interno: String, multimedia: Object }, { collection: 'productos' });
        const ProdModel = mongoose.model('Producto', prodSchema);

        const code = '010564';

        const prodDoc = await ProdModel.findOne({ codigo_interno: code });
        console.log('PROD_SUFFIX:', prodDoc && prodDoc.multimedia?.principal ? prodDoc.multimedia.principal.slice(-20) : 'NOT_FOUND');

        const erpDoc = await ErpModel.findOne({ codigo: code });
        console.log('ERP_SUFFIX:', erpDoc && erpDoc.imagen ? erpDoc.imagen.slice(-20) : 'NOT_FOUND');

        const logSchema = new mongoose.Schema({ status: String, startTime: Date, errors: [String] }, { collection: 'synclogs' });
        const LogModel = mongoose.model('SyncLog', logSchema);
        const lastLog = await LogModel.findOne().sort({ startTime: -1 });
        console.log('LAST_SYNC_START:', lastLog ? lastLog.startTime : 'NONE');
        console.log('SYNC_STATUS:', lastLog ? lastLog.status : 'NONE');
        console.log('SYNC_ERRORS:', lastLog && lastLog.errors ? JSON.stringify(lastLog.errors) : 'NONE');

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

check();
