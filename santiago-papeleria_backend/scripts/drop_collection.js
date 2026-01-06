const mongoose = require('mongoose');
require('dotenv').config();

async function dropCollection() {
    const uri = 'mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority';
    console.log(`Connecting to ${uri}...`);

    try {
        await mongoose.connect(uri);
        console.log('Connected.');

        try {
            console.log('Dropping collection products...');
            await mongoose.connection.collection('productos').drop();
            console.log('Collection dropped.');
        } catch (e) {
            if (e.code === 26) {
                console.log('Collection "productos" not found (NamespaceNotFound). This is good, it means it is gone.');
            } else {
                throw e;
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

dropCollection();
