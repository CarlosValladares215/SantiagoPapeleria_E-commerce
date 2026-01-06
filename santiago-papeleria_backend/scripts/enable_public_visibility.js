const mongoose = require('mongoose');
require('dotenv').config();

async function enableVisibility() {
    const uri = 'mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority';
    console.log(`Connecting to ${uri}...`);

    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB.');

        const collection = mongoose.connection.collection('productos');

        // 1. Check current status
        const total = await collection.countDocuments({});
        const publicCount = await collection.countDocuments({ es_publico: true });
        const hiddenCount = await collection.countDocuments({ $or: [{ es_publico: false }, { es_publico: { $exists: false } }] });

        console.log(`Total Products: ${total}`);
        console.log(`Currently Public: ${publicCount}`);
        console.log(`Currently Hidden (or undefined): ${hiddenCount}`);

        // 2. Update strict "undefined" or "false" to true? 
        // User wants "Automatic" visibility. Assuming we should enable EVERYTHING initially.
        // Future "hiding" will set it to false, so we should be careful not to overwrite manual "false" if this was a mature system.
        // But since we are setting up, we'll enable all.

        console.log('Enabling visibility for ALL products...');
        const result = await collection.updateMany(
            {},
            { $set: { es_publico: true } }
        );

        console.log(`Updated ${result.modifiedCount} products to es_publico: true.`);

        const newPublicCount = await collection.countDocuments({ es_publico: true });
        console.log(`New Public Count: ${newPublicCount}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

enableVisibility();
