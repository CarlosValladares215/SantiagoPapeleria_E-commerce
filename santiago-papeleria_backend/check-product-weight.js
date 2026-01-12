const mongoose = require('mongoose');

// Connect (assuming localhost)
mongoose.connect('mongodb://localhost:27017/santiago_papeleria', {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true
}).then(() => {
    console.log("Connected");
    checkProduct();
}).catch(err => console.error(err));

const schema = new mongoose.Schema({ name: String, weight_kg: Number, peso_kg: Number }, { strict: false });
const Product = mongoose.model('productos', schema);

async function checkProduct() {
    try {
        const p = await Product.findOne({ name: { $regex: /Mochila/i } }).lean();
        if (p) {
            console.log("Product found:", p.name);
            console.log("Weight (peso_kg):", p.peso_kg);
            console.log("Weight (weight_kg):", p.weight_kg);
        } else {
            console.log("No product found with 'Mochila'");
        }
    } catch (e) { console.error(e); }
    finally { mongoose.disconnect(); }
}
