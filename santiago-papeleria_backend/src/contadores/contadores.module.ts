// src/contadores/contadores.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContadoresService } from './contadores.service';
import { Contadores, ContadorSchema } from './schemas/contador.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contadores.name, schema: ContadorSchema },
    ]),
  ],
  providers: [ContadoresService],
  // Exportamos el servicio para que PedidosModule pueda inyectarlo
  exports: [ContadoresService],
})
export class ContadoresModule {}
