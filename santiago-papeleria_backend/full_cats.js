const mongoose = require('mongoose');

// Define minimal schema to read
const ProductSchema = new mongoose.Schema({
    categoria_g3: String
}, { collection: 'productos_erp', strict: false });

const ProductModel = mongoose.model('ProductERP', ProductSchema);

async function run() {
    try {
        await mongoose.connect('mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority');
        const g3 = await ProductModel.distinct('categoria_g3');
        console.log(JSON.stringify(g3.sort()));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
