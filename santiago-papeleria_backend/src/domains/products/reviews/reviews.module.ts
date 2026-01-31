import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { SharedProductsModule } from '../shared';
import { Pedido, PedidoSchema } from '../../orders/schemas/pedido.schema';

/**
 * ReviewsModule
 * 
 * Provides product review functionality.
 */
@Module({
    imports: [
        SharedProductsModule,
        MongooseModule.forFeature([{ name: Pedido.name, schema: PedidoSchema }]),
    ],
    controllers: [ReviewsController],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule { }
