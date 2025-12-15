import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ProductosModule } from './productos/productos.module';
import { PedidosModule } from './pedido/pedidos.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ContadoresModule } from './contadores/contadores.module';
import { PromocionesModule } from './promociones/promociones.module';
import { ErpSyncModule } from './modules/erp-sync/erp-sync.module';
@Module({
  imports: [
    // Copia esta línea EXACTAMENTE en tu app.module.ts, verificando la contraseña.
    MongooseModule.forRoot('mongodb+srv://admin:admin@santiagopapeleria.ogosw2n.mongodb.net/PapeleriaSantiago?retryWrites=true&w=majority'),
    ProductosModule,
    PedidosModule,
    UsuariosModule,
    ContadoresModule,
    PromocionesModule,
    ErpSyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
