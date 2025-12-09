// src/usuarios/usuarios.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  // Exportamos el servicio o el módulo si otras entidades (como Pedidos) lo necesitan.
  exports: [UsuariosService, MongooseModule],
})
export class UsuariosModule {}
