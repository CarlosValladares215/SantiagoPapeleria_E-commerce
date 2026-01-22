"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const producto_schema_1 = require("../src/domains/products/schemas/producto.schema");
const categoria_schema_1 = require("../src/domains/products/schemas/categoria.schema");
const product_erp_schema_1 = require("../src/domains/products/schemas/product-erp.schema");
const mongoose_1 = require("@nestjs/mongoose");
async function bootstrap() {
    console.log('🔄 SCRIPT: Iniciando Backfill de Referencias de Categorías...');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const productoModel = app.get((0, mongoose_1.getModelToken)(producto_schema_1.Producto.name));
        const categoriaModel = app.get((0, mongoose_1.getModelToken)(categoria_schema_1.Categoria.name));
        const productErpModel = app.get((0, mongoose_1.getModelToken)(product_erp_schema_1.ProductERP.name));
        const products = await productoModel.find({}).exec();
        console.log(`📋 Encontrados ${products.length} productos enriquecidos para procesar.`);
        let processed = 0;
        let matched = 0;
        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        for (const product of products) {
            const g1 = product.clasificacion?.linea;
            const g2 = product.clasificacion?.grupo;
            const g3 = product.clasificacion?.marca;
            const erpProduct = await productErpModel.findOne({ codigo: product.codigo_interno }).lean();
            const updates = {};
            if (g1) {
                const cat1 = await categoriaModel.findOne({
                    nombre: { $regex: `^${escapeRegex(g1)}$`, $options: 'i' },
                    nivel: 1
                });
                if (cat1)
                    updates.categoria_linea_id = cat1._id;
            }
            if (g2) {
                const cat2 = await categoriaModel.findOne({
                    nombre: { $regex: `^${escapeRegex(g2)}$`, $options: 'i' },
                    nivel: { $lte: 2 }
                });
                if (cat2)
                    updates.categoria_grupo_id = cat2._id;
            }
            if (erpProduct && erpProduct.categoria_g3 && erpProduct.categoria_g3 !== erpProduct.categoria_g2) {
                const cat3 = await categoriaModel.findOne({
                    nombre: { $regex: `^${escapeRegex(erpProduct.categoria_g3)}$`, $options: 'i' }
                });
                if (cat3)
                    updates.categoria_sub_id = cat3._id;
            }
            if (Object.keys(updates).length > 0) {
                await productoModel.updateOne({ _id: product._id }, { $set: updates });
                matched++;
            }
            processed++;
            if (processed % 100 === 0) {
                console.log(`   ⏳ Procesados: ${processed}/${products.length}...`);
            }
        }
        console.log(`✅ Backfill completado!`);
        console.log(`   Total: ${processed}`);
        console.log(`   Actualizados con referencias: ${matched}`);
    }
    catch (error) {
        console.error('❌ Error en backfill:', error);
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=backfill-category-refs.js.map