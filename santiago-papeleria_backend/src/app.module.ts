import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { ProductosModule } from './productos/productos.module';
import { PedidosModule } from './pedido/pedidos.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ContadoresModule } from './contadores/contadores.module';
import { PromocionesModule } from './promociones/promociones.module';

@Module({
  imports: [
    // Copia esta línea EXACTAMENTE en tu app.module.ts, verificando la contraseña.
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    ProductosModule,
    PedidosModule,
    UsuariosModule,
    ContadoresModule,
    PromocionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
