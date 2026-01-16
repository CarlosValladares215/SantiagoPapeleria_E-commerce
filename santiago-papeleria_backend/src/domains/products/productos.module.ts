// src/productos/productos.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { Producto, ProductoSchema } from './schemas/producto.schema';
import { ProductERP, ProductERPSchema } from './schemas/product-erp.schema';
import { MovimientoStock, MovimientoStockSchema } from './schemas/movimiento-stock.schema';
import { Categoria, CategoriaSchema } from './schemas/categoria.schema';

import { HttpModule } from '@nestjs/axios';

import { forwardRef } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { ErpSyncModule } from '../erp/sync/erp-sync.module';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Producto.name, schema: ProductoSchema },
      { name: ProductERP.name, schema: ProductERPSchema },
      { name: MovimientoStock.name, schema: MovimientoStockSchema },
      { name: Categoria.name, schema: CategoriaSchema },
    ]),
    forwardRef(() => ErpSyncModule),
  ],
  controllers: [ProductosController],
  providers: [ProductosService, MovimientosService],
  exports: [ProductosService, MovimientosService, MongooseModule]
})
export class ProductosModule { }
