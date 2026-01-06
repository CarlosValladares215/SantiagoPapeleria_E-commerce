const mongoose = require('mongoose');

async function fixExtensions() {
    const uri = 'mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority';
    console.log(`Connecting to ${uri}...`);

    try {
        await mongoose.connect(uri);
        console.log('Connected.');

        const collection = mongoose.connection.collection('productos');

        // Update all documents where multimedia.principal contains ".jpg"
        // Replace .jpg with .png
        // MongoDB 4.2+ allows pipeline updates for string replacement, but to be safe and simple,
        // we will iterate and update. Or use updateMany with pipeline if supported.
        // Let's use iteration for safety/logging.

        const cursor = collection.find({ "multimedia.principal": { $regex: /\.jpg$/ } });
        let count = 0;

        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            if (doc.multimedia && doc.multimedia.principal) {
                const newUrl = doc.multimedia.principal.replace('.jpg', '.png');
                await collection.updateOne(
                    { _id: doc._id },
                    { $set: { "multimedia.principal": newUrl } }
                );
                count++;
            }
        }

        console.log(`Fixed ${count} products.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

fixExtensions();
