const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/santiago_papeleria').then(async () => {
    console.log("Connected");
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    // Try finding any product in 'productos'
    const schema = new mongoose.Schema({}, { strict: false });
    const Product = mongoose.model('productos', schema);
    const p = await Product.findOne();
    console.log("Sample from 'productos':", p ? p.nombre || p.name : "None");

    // Try 'products'
    const ProductEn = mongoose.model('products', schema);
    const p2 = await ProductEn.findOne();
    console.log("Sample from 'products':", p2 ? p2.nombre || p2.name : "None");

    mongoose.disconnect();
}).catch(e => console.error(e));
