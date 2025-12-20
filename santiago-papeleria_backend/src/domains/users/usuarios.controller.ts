import { Controller, Get, Post, Put, Body, Param, NotFoundException, Query, UnauthorizedException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsuariosService } from './usuarios.service';
import { UsuarioDocument } from './schemas/usuario.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { RegisterDto } from './dto/register.dto';

import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { EmailService } from './services/email.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Controller('usuarios') // Ruta base: /usuarios
export class UsuariosController {
  private readonly jwtSecret: string;

  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'fallback-dev-secret-change-in-production');
  }

  // POST /usuarios/login
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.usuariosService.findByEmail(dto.email);
    // Generic error for security
    if (!user) throw new UnauthorizedException('Incorrect credentials');

    // Check blocking
    if (user.blocked_until && new Date() < user.blocked_until) {
      throw new ForbiddenException('Account temporarily blocked. Try again later.');
    }

    if (!user.email_verified) {
      throw new ForbiddenException('Please verify your email first');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      user.failed_attempts = (user.failed_attempts || 0) + 1;
      if (user.failed_attempts >= 5) {
        user.blocked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min block
      }
      await user.save();
      throw new UnauthorizedException(`Incorrect credentials (Attempt ${user.failed_attempts}/5)`);
    }

    // Reset attempts on success
    user.failed_attempts = 0;
    user.blocked_until = null as any;
    await user.save();

    const token = jwt.sign({
      sub: user._id,
      email: user.email,
      roles: [user.tipo_cliente], // can be MINORISTA or MAYORISTA
    }, this.jwtSecret, { expiresIn: '7d' });

    return { access_token: token, user: { id: user._id, email: user.email, roles: [user.tipo_cliente] } };
  }

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
    // 1. Validar Duplicados
    const existingEmail = await this.usuariosService.findByEmail(dto.email);
    if (existingEmail) {
      throw new ConflictException('Este email ya está registrado');
    }

    if (dto.cedula) {
      const existingCedula = await this.usuariosService.findByCedula(dto.cedula);
      if (existingCedula) {
        throw new ConflictException('Esta cédula ya está registrada');
      }
    }

    // 2. Generar código simple de 6 caracteres (Hex)
    const token = crypto.randomBytes(3).toString('hex').toUpperCase();
    const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // 3. Mapeo de DTO a Schema
    const userData = {
      nombres: dto.name,
      email: dto.email,
      password: dto.password, // Service hashará
      tipo_cliente: dto.client_type,
      cedula: dto.cedula,
      telefono: dto.telefono,
      email_verified: false,
      verification_token: token,
      verification_token_expiration: expiration,
      role: 'customer' // Default
    };

    const user = await this.usuariosService.registerInternal(userData);

    // 4. Enviar email
    await this.emailService.sendVerificationEmail(dto.email, token, dto.name);
    return { message: 'User registered. Check your email.', userId: user._id };
  }

  // POST /usuarios/resend-verification
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    const user = await this.usuariosService.findByEmail(dto.email);
    if (!user) {
      // Security: don't reveal if email exists
      return { message: 'If email exists, verification link sent' };
    }

    if (user.email_verified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new token (6 chars hex)
    const newToken = crypto.randomBytes(3).toString('hex').toUpperCase();

    user.verification_token = newToken;
    user.verification_token_expiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await this.emailService.sendVerificationEmail(dto.email, newToken, user.nombres);
    return { message: 'Verification email sent' };
  }

  // GET /usuarios/verify-email
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Query('redirect') redirect?: string) {
    if (!token) throw new BadRequestException('Token required');

    // Buscar usuario por token
    const user = await this.usuariosService.findByToken(token);

    // HARDENING: Si no encuentra usuario por token, verificar si el token ya fue usado o es inválido.
    // Como findByToken solo busca coincidencias exactas y nosotros borramos el token al usarlo, 
    // si no lo encuentra es inválido o expirado/usado.
    if (!user) {
      throw new BadRequestException('El enlace de verificación es inválido o ya ha sido utilizado.');
    }

    // Doble validación fecha
    if (user.verification_token_expiration && new Date() > user.verification_token_expiration) {
      throw new UnauthorizedException('El enlace de verificación ha expirado.');
    }

    // Activar cuenta
    user.email_verified = true;
    user.verification_token = null as any; // Clear token explicitly
    user.verification_token_expiration = null as any; // Clear expiration explicitly

    await user.save();

    // AUTO-LOGIN: Generar token JWT
    const jwtToken = jwt.sign({
      sub: user._id,
      email: user.email,
      roles: [user.tipo_cliente],
    }, this.jwtSecret, { expiresIn: '7d' });

    return {
      verified: true,
      message: 'Cuenta verificada exitosamente',
      access_token: jwtToken, // Return token for auto-login
      user: {
        id: user._id,
        email: user.email,
        nombres: user.nombres,
        roles: [user.tipo_cliente]
      }
    };
  }

  // POST /usuarios/forgot-password
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    if (!email) throw new BadRequestException('Email is required');

    const user = await this.usuariosService.findByEmail(email);
    if (!user) {
      // Security: Prevent user enumeration, return success even if not found
      return { message: 'Si el correo existe, se han enviado las instrucciones.' };
    }

    // Rate Limiting Check (Basic Implementation)
    // En producción idealmente usar Redis o un campo last_reset_request en DB
    // Por ahora confiamos en la expiración del token existente: 
    // Si ya tiene un token válido generado hace menos de 1 minuto, bloquear.
    if (user.reset_password_expires && user.reset_password_expires.getTime() > Date.now() + 59 * 60 * 1000) {
      // Si expira en más de 59 minutos, significa que se generó hace menos de 1 minuto
      // Silently fail or return same generic message to prevent spam
      return { message: 'Si el correo existe, se han enviado las instrucciones.' };
    }

    // Generate secure token (32 bytes hex)
    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // TODO in future: Hash token before saving
    user.reset_password_token = token;
    user.reset_password_expires = expiration;
    await user.save();

    await this.emailService.sendPasswordResetEmail(user.email, token, user.nombres);

    return { message: 'Si el correo existe, se han enviado las instrucciones.' };
  }

  // POST /usuarios/reset-password
  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    const { token, newPassword } = body;
    if (!token || !newPassword) throw new BadRequestException('Token and new password verify are required');

    if (newPassword.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }

    const user = await this.usuariosService.findByResetToken(token);

    // HARDENING: Token inválido, usado o no encontrado
    if (!user) {
      throw new BadRequestException('El enlace de recuperación es inválido o ya ha sido utilizado.');
    }

    // Expiración
    if (user.reset_password_expires && new Date() > user.reset_password_expires) {
      throw new UnauthorizedException('El enlace de recuperación ha expirado.');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    user.password_hash = hash;

    // CRITICAL: Invalidate tokens
    user.reset_password_token = null as any;
    user.reset_password_expires = null as any;

    // Optional: Reset failed attempts on proactive password change
    user.failed_attempts = 0;
    user.blocked_until = null as any;

    await user.save();

    return { message: 'Contraseña restablecida correctamente. Ahora puedes iniciar sesión.' };
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


}
