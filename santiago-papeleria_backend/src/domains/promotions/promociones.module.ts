import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromocionesService } from './promociones.service';
import { PromocionesController } from './promociones.controller';
import { Promocion, PromocionSchema } from './schemas/promocion.schema';
import { PromocionHistorial, PromocionHistorialSchema } from './schemas/promocion-historial.schema';
import { ProductosModule } from '../products/productos.module';
import { Pedido, PedidoSchema } from '../orders/schemas/pedido.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promocion.name, schema: PromocionSchema },
      { name: PromocionHistorial.name, schema: PromocionHistorialSchema },
      { name: Pedido.name, schema: PedidoSchema },
    ]),
    ProductosModule,
  ],
  controllers: [PromocionesController],
  providers: [PromocionesService],
  exports: [PromocionesService],
})
export class PromocionesModule { }
