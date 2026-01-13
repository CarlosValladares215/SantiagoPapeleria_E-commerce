// Run this script from the backend directory with: npx dotenvx run -- node scripts/drop_index_v4.js

const mongoose = require('mongoose');
const fs = require('fs');

(async () => {
    // The URI should be injected by dotenvx
    const uri = process.env.MONGODB_URI;
    const output = [];

    if (!uri) {
        output.push('ERROR: MONGODB_URI not set!');
        output.push('Run with: npx dotenvx run -- node scripts/drop_index_v4.js');
        fs.writeFileSync('index_result.txt', output.join('\n'));
        console.log('Error - see index_result.txt');
        return;
    }

    // Mask the password in the output
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    output.push('Connecting to: ' + maskedUri);

    try {
        await mongoose.connect(uri);
        output.push('Connected successfully!');

        const db = mongoose.connection.db;
        const collection = db.collection('productos');

        // Check if collection exists
        const collections = await db.listCollections({ name: 'productos' }).toArray();
        if (collections.length === 0) {
            output.push('\nCollection "productos" does not exist yet - no index to drop.');
            output.push('The sync will create it fresh without the problematic index.');
        } else {
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
                output.push(`\n>>> Dropping index: ${targetIndex}...`);
                await collection.dropIndex(targetIndex);
                output.push('>>> SUCCESS! Index dropped.');
            } else {
                output.push(`\nIndex "${targetIndex}" NOT FOUND - nothing to drop.`);
            }

            // Show indexes after
            output.push('\n=== INDEXES AFTER ===');
            const after = await collection.indexes();
            for (const idx of after) {
                output.push(`  - ${idx.name}`);
            }
        }

    } catch (err) {
        output.push('ERROR: ' + err.message);
        output.push(err.stack);
    } finally {
        await mongoose.disconnect();
        output.push('\nDone.');

        // Write to file
        fs.writeFileSync('index_result.txt', output.join('\n'));
        console.log('Result written to index_result.txt');
    }
})();
