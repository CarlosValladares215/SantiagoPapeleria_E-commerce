import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';

// Subdomain Modules
import { SharedProductsModule } from './shared';
import { CatalogModule } from './catalog';
import { CategoriesModule } from './categories';
import { AdminModule } from './admin';
import { InventoryModule } from './inventory';
import { ReviewsModule } from './reviews';

// Schemas (kept at root for external module compatibility)
import { Producto, ProductoSchema } from './schemas/producto.schema';
import { ProductERP, ProductERPSchema } from './schemas/product-erp.schema';
import { MovimientoStock, MovimientoStockSchema } from './schemas/movimiento-stock.schema';
import { Categoria, CategoriaSchema } from './schemas/categoria.schema';

// External dependencies
import { ErpSyncModule } from '../erp/sync/erp-sync.module';

/**
 * ProductosModule
 * 
 * Main orchestrator module for the Products domain.
 * 
 * IMPORTANT: Module import ORDER matters for route registration!
 * Modules with specific routes (CategoriesModule, ReviewsModule, etc.)
 * MUST be imported BEFORE CatalogModule, which has the catch-all @Get(':id') route.
 */
@Module({
  imports: [
    HttpModule,

    // Subdomain modules - ORDER MATTERS FOR ROUTING!
    SharedProductsModule,
    CategoriesModule,  // /productos/counts, /structure, /brands - BEFORE catch-all
    ReviewsModule,     // /productos/:id/reviews (POST)
    InventoryModule,   // /productos/:sku/history, /admin/stats
    forwardRef(() => AdminModule),  // /productos/admin/*
    CatalogModule,     // /productos and /productos/:id - LAST (catch-all)

    // Schema registration for external consumers
    MongooseModule.forFeature([
      { name: Producto.name, schema: ProductoSchema },
      { name: ProductERP.name, schema: ProductERPSchema },
      { name: MovimientoStock.name, schema: MovimientoStockSchema },
      { name: Categoria.name, schema: CategoriaSchema },
    ]),

    // External module dependency
    forwardRef(() => ErpSyncModule),
  ],
  exports: [
    // Re-export subdomain modules - they export their own services
    CatalogModule,
    CategoriesModule,
    AdminModule,
    InventoryModule,
    ReviewsModule,
    SharedProductsModule,

    // Re-export MongooseModule for external access
    MongooseModule,
  ],
})
export class ProductosModule { }
