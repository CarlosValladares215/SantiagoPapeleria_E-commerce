// src/pedidos/pedidos.module.ts (ACTUALIZADO)

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { Pedido, PedidoSchema } from './schemas/pedido.schema';
import { ContadoresModule } from '../../core/counters/contadores.module'; // <-- IMPORTAR

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Pedido.name, schema: PedidoSchema }]),
    ContadoresModule, // <-- AGREGAR
  ],
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule { }
