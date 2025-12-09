const { MongoClient } = require('mongodb');

async function main() {
    // Connection URL from AppModule
    const url = 'mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/?retryWrites=true&w=majority';
    const client = new MongoClient(url);
    const dbName = 'PapeleriaSantiago';

    try {
        await client.connect();
        console.log('Connected successfully to server');
        const db = client.db(dbName);
        const collection = db.collection('productos');

        // MOCK TIERS
        const mockTiers = [
            { min: 1, max: 49, discount: 0, label: '1-49 unidades' },
            { min: 50, max: 99, discount: 0.09, label: '50-99 unidades', badge: '9% OFF' },
            { min: 100, max: 499, discount: 0.15, label: '100-499 unidades', badge: '15% OFF' },
            { min: 500, max: 999, discount: 0.22, label: '500-999 unidades', badge: '22% OFF' },
            { min: 1000, max: 4999, discount: 0.28, label: '1000-4999 unidades', badge: '28% OFF' },
            { min: 5000, max: 99999, discount: 0.35, label: '5000+ unidades', badge: '35% OFF' }
        ];

        // Find a product to update (e.g., matching "cuaderno")
        const product = await collection.findOne({ nombre: { $regex: /cuaderno/i } });

        if (product) {
            console.log(`Updating product: ${product.nombre} (${product._id})`);

            await collection.updateOne(
                { _id: product._id },
                { $set: { priceTiers: mockTiers } }
            );
            console.log('Product updated with price tiers.');
        } else {
            console.log('No matching product found.');
            // List a few products to debug
            const examples = await collection.find({}).limit(5).toArray();
            console.log('Available products:', examples.map(p => p.nombre));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

main();
