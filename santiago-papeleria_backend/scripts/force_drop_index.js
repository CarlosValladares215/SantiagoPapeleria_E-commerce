const mongoose = require('mongoose');
require('dotenv').config();

async function forceDrop() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/PapeleriaSantiago';
    console.log(`Connecting to ${uri}...`);

    try {
        await mongoose.connect(uri);
        console.log('Connected.');

        const collection = mongoose.connection.collection('productos');

        console.log('--- Indexes BEFORE ---');
        const indexesBefore = await collection.indexes();
        console.log(indexesBefore);

        const indexName = 'variantes.sku_1';
        const exists = indexesBefore.some(idx => idx.name === indexName);

        if (exists) {
            console.log(`Dropping index '${indexName}'...`);
            await collection.dropIndex(indexName);
            console.log('Index dropped.');
        } else {
            console.log(`Index '${indexName}' NOT found.`);
        }

        console.log('--- Indexes AFTER ---');
        const indexesAfter = await collection.indexes();
        console.log(indexesAfter);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

forceDrop();
