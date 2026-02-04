import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

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
import { ChatbotModule } from './domains/chatbot/chatbot.module';
import { PaymentsModule } from './domains/payments/payments.module';

@Module({
  imports: [
    // ConfigModule debe estar PRIMERO para cargar las variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Ahora MongooseModule puede usar process.env.MONGO_URI
    MongooseModule.forRoot(process.env.MONGO_URI!),
    ProductosModule,
    PedidosModule,
    UsuariosModule,
    NotificationsModule,
    ContadoresModule,
    PromocionesModule,
    ErpSyncModule,
    ShippingModule,
    ReportsModule,
    PaymentsModule,
    FilesModule,
    ChatbotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
