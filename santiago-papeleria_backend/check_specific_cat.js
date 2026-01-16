const mongoose = require('mongoose');

// Define minimal schema to read
const ProductSchema = new mongoose.Schema({
    codigo: String,
    nombre: String,
    categoria_g2: String,
    categoria_g3: String
}, { collection: 'productos_erp', strict: false });

const ProductModel = mongoose.model('ProductERP', ProductSchema);

async function run() {
    try {
        await mongoose.connect('mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority');
        console.log('Connected to MongoDB Atlas');

        // Search for anything resembling "COLORES"
        const regex = /COLORES/i;
        const products = await ProductModel.find({
            $or: [
                { categoria_g2: regex },
                { categoria_g3: regex }
            ]
        }).limit(5).lean();

        if (products.length > 0) {
            console.log(`Found ${products.length} products matching /COLORES/i.`);
            products.forEach(p => {
                console.log(`- [${p.codigo}] G2: "${p.categoria_g2}" | G3: "${p.categoria_g3}"`);
            });
        } else {
            console.log('No products found matching /COLORES/i in G2 or G3.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
