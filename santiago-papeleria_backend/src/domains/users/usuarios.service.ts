// src/usuarios/usuarios.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken'; // Or use @nestjs/jwt service if preferred, but using raw per prompt request

@Injectable()
export class UsuariosService {
  // JWT operations are handled in the controller with ConfigService

  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
  ) { }

  // Crear un nuevo usuario (Registro Legacy - Ahora seguro)
  async create(createUsuarioDto: CreateUsuarioDto): Promise<UsuarioDocument> {
    // Hash password properly even for legacy endpoint
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(createUsuarioDto.password, salt);

    const createdUsuario = new this.usuarioModel({
      ...createUsuarioDto,
      password_hash: hash,
      estado: 'ACTIVO',
      fecha_creacion: new Date(),
    });
    return createdUsuario.save();
  }

  // Método interno para registro con verificación (usado por el Controller)
  async registerInternal(data: any): Promise<UsuarioDocument> {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(data.password, salt);

    const createdUsuario = new this.usuarioModel({
      ...data,
      password_hash: hash,
      estado: 'ACTIVO',
      fecha_creacion: new Date(),
    });
    return createdUsuario.save();
  }

  // Buscar por token de verificación
  async findByToken(token: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findOne({ verification_token: token }).exec();
  }

  // Buscar por email (case insensitive)
  async findByEmail(email: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findOne({ email: email.toLowerCase() }).exec();
  }

  // Buscar por cédula
  async findByCedula(cedula: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findOne({ cedula }).exec();
  }

  // Buscar por token de recuperación de contraseña
  async findByResetToken(token: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findOne({ reset_password_token: token }).exec();
  }

  // Buscar todos los usuarios
  async findAll(): Promise<UsuarioDocument[]> {
    return this.usuarioModel.find().exec();
  }

  // Actualizar usuario
  async update(id: string, updateData: any): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findByIdAndUpdate(id, updateData, { new: true }).populate('carrito.product').exec();
  }

  // Buscar por ID
  async findById(id: string): Promise<UsuarioDocument | null> {
    return this.usuarioModel.findById(id).populate('carrito.product').exec();
  }
}
