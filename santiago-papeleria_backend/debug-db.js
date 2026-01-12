
const mongoose = require('mongoose');

// Connection string from app.module.ts
const uri = 'mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority';

async function verifyDb() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected!');

        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in database:');
        collections.forEach(c => console.log(` - ${c.name}`));

        // Check 'pedidos' collection specifically
        const Pedido = mongoose.connection.db.collection('pedidos');
        const count = await Pedido.countDocuments();
        console.log(`\nDocument count in 'pedidos': ${count}`);

        if (count > 0) {
            const sample = await Pedido.findOne();
            console.log('Sample document:', sample);
        } else {
            // Maybe it's named 'orders' or 'pedidos_webs'?
            console.log("Checking other potential names like 'orders'...");
            const Orders = mongoose.connection.db.collection('orders');
            const countOrders = await Orders.countDocuments();
            console.log(`Document count in 'orders': ${countOrders}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyDb();
