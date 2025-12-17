// src/usuarios/usuarios.controller.ts

import { Controller, Get, Post, Put, Body, Param, NotFoundException, Query, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuarioDocument } from './schemas/usuario.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from './services/email.service';
import * as crypto from 'crypto';

@Controller('usuarios') // Ruta base: /usuarios
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly emailService: EmailService
  ) { }

  // POST /usuarios (Ruta de Registro legacy)
  @Post()
  async create(
    @Body() createUsuarioDto: CreateUsuarioDto,
  ): Promise<UsuarioDocument> {
    return this.usuariosService.create(createUsuarioDto);
  }

  // POST /usuarios/register (Nuevo registro con verificación)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    // Generar token simple (hex)
    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Mapeo de DTO a Schema (name -> nombres, client_type -> tipo_cliente)
    // Y añadir campos de verificación
    const userData = {
      nombres: dto.name,
      email: dto.email,
      password: dto.password, // Service hashará (placeholder)
      tipo_cliente: dto.client_type,
      email_verified: false,
      verification_token: token,
      verification_token_expiration: expiration,
      role: 'customer' // Default
    };

    const user = await this.usuariosService.registerInternal(userData);

    await this.emailService.sendVerificationEmail(dto.email, token);
    return { message: 'User registered. Check your email.', userId: user._id };
  }

  // GET /usuarios/verify-email
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Token required');

    const user = await this.usuariosService.findByToken(token);
    if (!user) throw new UnauthorizedException('Invalid or expired token');

    // Verificar expiración
    if (user.verification_token_expiration && new Date() > user.verification_token_expiration) {
      throw new UnauthorizedException('Token expired');
    }

    user.email_verified = true;
    user.verification_token = null as any; // Clear token
    user.verification_token_expiration = null as any;

    await user.save();
    return { verified: true };
  }

  // GET /usuarios
  @Get()
  async findAll(): Promise<UsuarioDocument[]> {
    return this.usuariosService.findAll();
  }

  // PUT /usuarios/:id
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: any,
  ): Promise<UsuarioDocument> {
    const updatedUser = await this.usuariosService.update(id, updateData);
    if (!updatedUser) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return updatedUser;
  }

  // POST /usuarios/login
  @Post('login')
  async login(@Body() body: any): Promise<UsuarioDocument> {
    const { email, password } = body;
    const user = await this.usuariosService.validateUser(email, password);

    if (!user) {
      throw new Error('Credenciales inválidas');
      // En una app real usaríamos: throw new UnauthorizedException('Credenciales inválidas');
      // pero para mantenerlo simple y sin importar más cosas por ahora:
    }

    return user;
  }
}
