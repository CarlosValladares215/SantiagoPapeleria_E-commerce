const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/PapeleriaSantiago';
    const output = [];

    output.push('Connecting to: ' + uri);

    try {
        await mongoose.connect(uri);
        output.push('Connected!');

        const db = mongoose.connection.db;
        const collection = db.collection('productos');

        // List current indexes
        output.push('\n=== CURRENT INDEXES ===');
        const indexes = await collection.indexes();
        for (const idx of indexes) {
            output.push(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
        }

        // Try to drop the variantes.sku_1 index
        const targetIndex = 'variantes.sku_1';
        const hasIndex = indexes.some(i => i.name === targetIndex);

        if (hasIndex) {
            output.push(`\nDropping index: ${targetIndex}...`);
            await collection.dropIndex(targetIndex);
            output.push('SUCCESS! Index dropped.');
        } else {
            output.push(`\nIndex "${targetIndex}" NOT FOUND - nothing to drop.`);
        }

        // Show indexes after
        output.push('\n=== INDEXES AFTER ===');
        const after = await collection.indexes();
        for (const idx of after) {
            output.push(`  - ${idx.name}`);
        }

    } catch (err) {
        output.push('ERROR: ' + err.message);
    } finally {
        await mongoose.disconnect();
        output.push('\nDone.');

        // Write to file
        fs.writeFileSync('index_result.txt', output.join('\n'));
        console.log('Result written to index_result.txt');
    }
})();
