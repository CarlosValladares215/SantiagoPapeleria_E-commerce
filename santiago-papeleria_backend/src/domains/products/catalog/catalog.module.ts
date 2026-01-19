import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { SharedProductsModule } from '../shared';
import { PedidoSchema } from '../../orders/schemas/pedido.schema';

/**
 * CatalogModule
 * 
 * Provides public-facing catalog functionality.
 * Imports SharedProductsModule for Mongoose schemas and merger service.
 */
@Module({
    imports: [
        SharedProductsModule,
        MongooseModule.forFeature([{ name: 'Pedido', schema: PedidoSchema }])
    ],
    controllers: [CatalogController],
    providers: [CatalogService],
    exports: [CatalogService],
})
export class CatalogModule { }
