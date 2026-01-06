import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ProductosModule } from './domains/products/productos.module';
import { PedidosModule } from './domains/orders/pedidos.module';
import { UsuariosModule } from './domains/users/usuarios.module';
import { ContadoresModule } from './core/counters/contadores.module';
import { PromocionesModule } from './domains/promotions/promociones.module';
import { ErpSyncModule } from './domains/erp/sync/erp-sync.module';
import { FilesModule } from './shared/files/files.module';
import { NotificationsModule } from './domains/notifications/notifications.module';
import { ShippingModule } from './domains/shipping/shipping.module';
import { ReportsModule } from './domains/reports/reports.module';
@Module({
  imports: [
    // Copia esta línea EXACTAMENTE en tu app.module.ts, verificando la contraseña.
    MongooseModule.forRoot('mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority'),
    ProductosModule,
    PedidosModule,
    UsuariosModule,
    NotificationsModule,
    ContadoresModule,
    PromocionesModule,
    ErpSyncModule,
    ShippingModule,
    ReportsModule,
    FilesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
