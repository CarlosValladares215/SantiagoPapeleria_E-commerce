// src/productos/productos.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto, ProductoSchema } from './schemas/producto.schema';
import { ProductERP, ProductERPSchema } from './schemas/product-erp.schema';

import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
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
  exports: [ProductosService]
})
export class ProductosModule { }
