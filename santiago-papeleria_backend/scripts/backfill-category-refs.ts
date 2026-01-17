
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module'; // Adjust path as needed
import { Producto } from '../src/domains/products/schemas/producto.schema';
import { Categoria } from '../src/domains/products/schemas/categoria.schema';
import { ProductERP } from '../src/domains/products/schemas/product-erp.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

async function bootstrap() {
    console.log('🔄 SCRIPT: Iniciando Backfill de Referencias de Categorías...');

    // Create context without listening
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const productoModel = app.get<Model<Producto>>(getModelToken(Producto.name));
        const categoriaModel = app.get<Model<Categoria>>(getModelToken(Categoria.name));
        const productErpModel = app.get<Model<ProductERP>>(getModelToken(ProductERP.name));

        // 1. Fetch all products enriched
        const products = await productoModel.find({}).exec();
        console.log(`📋 Encontrados ${products.length} productos enriquecidos para procesar.`);

        let processed = 0;
        let matched = 0;

        // Helper to escape regex
        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        for (const product of products) {
            // Get classification strings
            const g1 = product.clasificacion?.linea;
            const g2 = product.clasificacion?.grupo;
            const g3 = product.clasificacion?.marca; // Assuming marca is sometimes used as g3 or we take from ERP?
            // Actually products schema has: linea, grupo, marca.
            // Wait, in sync we map: linea=G1, grupo=G2.

            // We need the ERP source to be sure about G3 if needed, or query ERP model
            const erpProduct = await productErpModel.findOne({ codigo: product.codigo_interno }).lean();

            const updates: any = {};

            // Resolve Nivel 1 (Linea)
            if (g1) {
                const cat1 = await categoriaModel.findOne({
                    nombre: { $regex: `^${escapeRegex(g1)}$`, $options: 'i' },
                    nivel: 1
                });
                if (cat1) updates.categoria_linea_id = cat1._id;
            }

            // Resolve Nivel 2 (Grupo)
            if (g2) {
                const cat2 = await categoriaModel.findOne({
                    nombre: { $regex: `^${escapeRegex(g2)}$`, $options: 'i' },
                    nivel: { $lte: 2 } // Could be level 2
                });
                if (cat2) updates.categoria_grupo_id = cat2._id;
            }

            // Resolve Nivel 3 (Sub) from ERP source if available
            if (erpProduct && erpProduct.categoria_g3 && erpProduct.categoria_g3 !== erpProduct.categoria_g2) {
                const cat3 = await categoriaModel.findOne({
                    nombre: { $regex: `^${escapeRegex(erpProduct.categoria_g3)}$`, $options: 'i' }
                });
                if (cat3) updates.categoria_sub_id = cat3._id;
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

    } catch (error) {
        console.error('❌ Error en backfill:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
