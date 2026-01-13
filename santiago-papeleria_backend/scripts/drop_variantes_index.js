const mongoose = require('mongoose');
require('dotenv').config();

async function checkAndDropIndex() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/PapeleriaSantiago';
    console.log(`Connecting to MongoDB...`);

    try {
        await mongoose.connect(uri);
        console.log('Connected.');

        const collection = mongoose.connection.collection('productos');

        console.log('\n--- Current Indexes ---');
        const indexes = await collection.indexes();
        indexes.forEach(idx => console.log(`- ${idx.name}: ${JSON.stringify(idx.key)}`));

        const indexName = 'variantes.sku_1';
        const exists = indexes.some(idx => idx.name === indexName);

        if (exists) {
            console.log(`\nDropping index '${indexName}'...`);
            await collection.dropIndex(indexName);
            console.log('Index dropped successfully!');
        } else {
            console.log(`\nIndex '${indexName}' does NOT exist. Nothing to drop.`);
        }

        console.log('\n--- Indexes After ---');
        const indexesAfter = await collection.indexes();
        indexesAfter.forEach(idx => console.log(`- ${idx.name}: ${JSON.stringify(idx.key)}`));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected.');
    }
}

checkAndDropIndex();
