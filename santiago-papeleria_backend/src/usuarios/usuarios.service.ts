// src/usuarios/usuarios.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
  ) {}

  // Crear un nuevo usuario (Registro)
  async create(createUsuarioDto: CreateUsuarioDto): Promise<UsuarioDocument> {
    // **IMPORTANTE**: Sustituir por hash real (ej: bcrypt)
    // Usamos el password_hash para coincidir con el Schema,
    // pero guardamos el password tal como viene (SOLO PARA PRUEBAS).
    const passwordHashPlaceholder = `HASH_DE_${createUsuarioDto.password}`;

    const createdUsuario = new this.usuarioModel({
      ...createUsuarioDto,
      password_hash: passwordHashPlaceholder,
      estado: 'ACTIVO',
      fecha_creacion: new Date(),
    });
    return createdUsuario.save();
  }

  // Buscar todos los usuarios
  async findAll(): Promise<UsuarioDocument[]> {
    return this.usuarioModel.find().exec();
  }
}
