
const mongoose = require('mongoose');
const uri = 'mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority';

async function check() {
    try {
        await mongoose.connect(uri);
        console.log("CONNECTED");

        const Colls = await mongoose.connection.db.listCollections().toArray();
        console.log("\nCOLLECTIONS:");
        Colls.forEach(c => console.log(` - ${c.name}`));

        console.log("\nCOUNTS:");
        const p = mongoose.connection.db.collection('pedidos');
        const countP = await p.countDocuments();
        console.log(` - pedidos: ${countP}`);

        const o = mongoose.connection.db.collection('orders');
        const countO = await o.countDocuments();
        console.log(` - orders: ${countO}`);

        if (countP > 0) {
            const doc = await p.findOne();
            console.log("SAMPLE PEDIDO:", JSON.stringify(doc).substring(0, 100)); // Short sample
        }

    } catch (e) { console.error(e); }
    finally { await mongoose.disconnect(); }
}
check();
