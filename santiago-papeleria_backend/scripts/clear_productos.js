const mongoose = require('mongoose');
require('dotenv').config();

async function clearProductos() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/PapeleriaSantiago';
    console.log('Connecting to MongoDB...');

    try {
        await mongoose.connect(uri);
        console.log('Connected.');

        const collection = mongoose.connection.collection('productos');

        const countBefore = await collection.countDocuments();
        console.log(`Products before: ${countBefore}`);

        const result = await collection.deleteMany({});
        console.log(`Deleted ${result.deletedCount} products.`);

        const countAfter = await collection.countDocuments();
        console.log(`Products after: ${countAfter}`);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

clearProductos();
