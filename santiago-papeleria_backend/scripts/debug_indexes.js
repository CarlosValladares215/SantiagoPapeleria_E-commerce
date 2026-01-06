const mongoose = require('mongoose');
require('dotenv').config();

async function checkIndexes() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/PapeleriaSantiago';
    console.log(`Connecting to ${uri}...`);

    try {
        await mongoose.connect(uri);
        console.log('Connected.');

        const collection = mongoose.connection.collection('productos');
        const indexes = await collection.indexes();

        console.log('Current Indexes on "productos":');
        console.log(JSON.stringify(indexes, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkIndexes();
