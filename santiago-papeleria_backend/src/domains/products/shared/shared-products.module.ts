import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductMergerService } from './product-merger.service';
import { Producto, ProductoSchema } from '../schemas/producto.schema';
import { ProductERP, ProductERPSchema } from '../schemas/product-erp.schema';
import { MovimientoStock, MovimientoStockSchema } from '../schemas/movimiento-stock.schema';

/**
 * SharedProductsModule
 * 
 * Provides core shared dependencies for all product subdomains:
 * - Mongoose schemas (Producto, ProductERP, MovimientoStock)
 * - ProductMergerService (fusion logic)
 * 
 * Design Decision: Keep schemas in original location during migration
 * to avoid breaking imports. Will relocate after full migration.
 */
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Producto.name, schema: ProductoSchema },
            { name: ProductERP.name, schema: ProductERPSchema },
            { name: MovimientoStock.name, schema: MovimientoStockSchema },
        ]),
    ],
    providers: [ProductMergerService],
    exports: [
        ProductMergerService,
        MongooseModule,
    ],
})
export class SharedProductsModule { }
