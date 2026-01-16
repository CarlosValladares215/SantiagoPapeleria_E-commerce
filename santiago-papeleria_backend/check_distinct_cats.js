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

        const g2 = await ProductModel.distinct('categoria_g2');
        const g3 = await ProductModel.distinct('categoria_g3');

        console.log('--- DISTINCT G2 VALUES ---');
        console.log(g2);
        console.log('--- DISTINCT G3 VALUES ---');
        console.log(g3);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
