const mongoose = require('mongoose');
require('dotenv').config();

(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/PapeleriaSantiago';
    console.log('Connecting to:', uri);

    try {
        await mongoose.connect(uri);
        console.log('Connected!');

        const db = mongoose.connection.db;
        const collection = db.collection('productos');

        // List current indexes
        console.log('\n=== CURRENT INDEXES ===');
        const indexes = await collection.indexes();
        for (const idx of indexes) {
            console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        }

        // Try to drop the variantes.sku_1 index
        const targetIndex = 'variantes.sku_1';
        const hasIndex = indexes.some(i => i.name === targetIndex);

        if (hasIndex) {
            console.log(`\nDropping index: ${targetIndex}...`);
            await collection.dropIndex(targetIndex);
            console.log('SUCCESS! Index dropped.');
        } else {
            console.log(`\nIndex "${targetIndex}" not found.`);
        }

        // Show indexes after
        console.log('\n=== INDEXES AFTER ===');
        const after = await collection.indexes();
        for (const idx of after) {
            console.log(`  - ${idx.name}`);
        }

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('\nDone.');
    }
})();
