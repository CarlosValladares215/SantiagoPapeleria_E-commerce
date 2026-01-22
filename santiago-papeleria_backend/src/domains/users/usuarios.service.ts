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

  // Toggle Favorite
  async toggleFavorite(userId: string, productId: string): Promise<UsuarioDocument | null> {
    console.log(`[UsuariosService] Toggling favorite for User ${userId}, Product ${productId}`);

    // Explicitly cast to string
    const pid = String(productId);

    // Validate ID format (Simple 24 hex char check) to prevent [object Object]
    const isValidId = /^[0-9a-fA-F]{24}$/.test(pid);
    if (!isValidId) {
      console.error(`[UsuariosService] Invalid Product ID format: ${pid}`);
      // Do not throw, just return null or ignore to prevent crashing
      return null;
    }

    const user = await this.usuarioModel.findById(userId);
    if (!user) {
      console.warn(`[UsuariosService] User ${userId} not found`);
      return null;
    }

    // CLEANUP: Remove '[object Object]' if present
    if (user.favorites && user.favorites.includes('[object Object]')) {
      console.warn('[UsuariosService] Cleaning up corrupted data...');
      await this.usuarioModel.findByIdAndUpdate(userId, { $pull: { favorites: '[object Object]' } });
    }

    console.log(`[UsuariosService] Current favorites for user:`, user.favorites);

    try {
      const favorites = user.favorites || [];
      // Force string conversion for comparison
      const index = favorites.findIndex(f => String(f) === pid);

      if (index > -1) {
        console.log(`[UsuariosService] Removing ${pid}`);
        await this.usuarioModel.findByIdAndUpdate(userId, { $pull: { favorites: pid } });
      } else {
        console.log(`[UsuariosService] Adding ${pid}`);
        await this.usuarioModel.findByIdAndUpdate(userId, { $addToSet: { favorites: pid } });
      }

      return this.usuarioModel.findById(userId).exec();
    } catch (e) {
      console.error(`[UsuariosService] Error updating favorites:`, e);
      // Emergency cleanup: Reset favorites if they are corrupted
      if (e.name === 'CastError') {
        console.warn(`[UsuariosService] Detected CastError. Resetting favorites for user ${userId}.`);
        await this.usuarioModel.findByIdAndUpdate(userId, { $set: { favorites: [pid] } }); // Set to just the new one
        return this.usuarioModel.findById(userId).exec();
      }
      throw e;
    }
  }
}
