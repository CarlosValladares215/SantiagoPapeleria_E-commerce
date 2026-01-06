// src/pedidos/pedidos.module.ts (ACTUALIZADO)

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { Pedido, PedidoSchema } from './schemas/pedido.schema';
import { ContadoresModule } from '../../core/counters/contadores.module';
import { UsuariosModule } from '../users/usuarios.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ErpSyncModule } from '../erp/sync/erp-sync.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Pedido.name, schema: PedidoSchema }]),
    ContadoresModule,
    UsuariosModule,
    NotificationsModule,
    forwardRef(() => ErpSyncModule), // Integración con DobraNet ERP
  ],
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule { }
