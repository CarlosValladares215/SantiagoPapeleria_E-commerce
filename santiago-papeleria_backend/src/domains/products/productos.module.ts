// src/productos/productos.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto, ProductoSchema } from './schemas/producto.schema';
import { ProductERP, ProductERPSchema } from './schemas/product-erp.schema';

import { HttpModule } from '@nestjs/axios';

import { forwardRef } from '@nestjs/common';
import { ErpSyncModule } from '../erp/sync/erp-sync.module'; // Adjust path if needed

@Module({
  imports: [
    HttpModule,
    forwardRef(() => ErpSyncModule), // Circular dependency resolution
    MongooseModule.forFeature([
      {
        name: Producto.name, // enriched
        schema: ProductoSchema,
      },
      {
        name: ProductERP.name, // erp_source
        schema: ProductERPSchema,
      },
    ]),
  ],
  controllers: [ProductosController],
  providers: [ProductosService],
  exports: [ProductosService, MongooseModule] // Export MongooseModule so ErpSyncService can use models
})
export class ProductosModule { }
