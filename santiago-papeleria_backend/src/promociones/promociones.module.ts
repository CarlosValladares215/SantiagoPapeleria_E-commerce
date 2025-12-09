// src/promociones/promociones.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromocionesService } from './promociones.service';
import { PromocionesController } from './promociones.controller';
import { Promociones, PromocionSchema } from './schemas/promocion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promociones.name, schema: PromocionSchema },
    ]),
  ],
  controllers: [PromocionesController],
  providers: [PromocionesService],
  // Exportamos el servicio para que el servicio de Pedidos pueda usarlo para calcular descuentos.
  exports: [PromocionesService],
})
export class PromocionesModule {}
