const mongoose = require('mongoose');

async function updatePlaceholders() {
    const uri = 'mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority';
    console.log(`Connecting to ${uri}...`);

    try {
        await mongoose.connect(uri);
        console.log('Connected.');

        const collection = mongoose.connection.collection('productos');

        // Update all documents where multimedia.principal contains "placeholder.png"
        // Replace with "product-placeholder.png"
        const cursor = collection.find({ "multimedia.principal": { $regex: /placeholder\.png$/ } });
        let count = 0;

        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            if (doc.multimedia && doc.multimedia.principal) {
                // If it's already product-placeholder.png, skip
                if (doc.multimedia.principal.endsWith("product-placeholder.png")) continue;

                const newUrl = doc.multimedia.principal.replace('placeholder.png', 'product-placeholder.png');
                await collection.updateOne(
                    { _id: doc._id },
                    { $set: { "multimedia.principal": newUrl } }
                );
                count++;
            }
        }

        console.log(`Updated ${count} placeholders.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

updatePlaceholders();
