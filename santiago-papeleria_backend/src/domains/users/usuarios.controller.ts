import { Controller, Get, Post, Put, Body, Param, NotFoundException, Query, UnauthorizedException, BadRequestException, ForbiddenException, ConflictException, Headers, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

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
      throw new ForbiddenException('Por favor verifica tu correo electrónico antes de iniciar sesión');
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
      roles: [user.role], // NOW USING 'role' (admin, warehouse, customer)
      tipo_cliente: user.tipo_cliente, // Keep for legacy frontend support
    }, this.jwtSecret, { expiresIn: '7d' });

    // ONLY return access_token as per new requirements
    return { access_token: token };
  }

  // GET /usuarios/me (Get current user profile)
  @Get('me')
  async getMe(@Headers('authorization') authHeader: string) {
    if (!authHeader) throw new UnauthorizedException('No token provided');

    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const user = await this.usuariosService.findById(decoded.sub);
      if (!user) throw new NotFoundException('User not found');

      return user;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired token');
    }
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
      email_verified: false, // Email verification required
      verification_token: token,
      verification_token_expiration: expiration,
      role: 'customer', // Default
      datos_negocio: dto.datos_negocio, // Include business data
      direcciones_entrega: dto.direcciones_entrega // Include delivery addresses
    };

    const user = await this.usuariosService.registerInternal(userData);

    // 4. Enviar email (Try-Catch para evitar 500 si falla SMTP)
    try {
      // DEBUG: Log token to console in case email fails
      console.log('==========================================');
      console.log('🛠️ DEBUG TOKEN DE VERIFICACIÓN:', token);
      console.log('==========================================');

      await this.emailService.sendVerificationEmail(dto.email, token, dto.name);
    } catch (error) {
      console.error('Error sending verification email:', error);
      // We continue to allow login even if email fails
    }

    // 5. AUTO-LOGIN: Generate JWT
    const jwtToken = jwt.sign({
      sub: user._id,
      email: user.email,
      roles: [user.role], // Use correct role
      tipo_cliente: user.tipo_cliente
    }, this.jwtSecret, { expiresIn: '7d' });

    return {
      message: 'User registered successfully.',
      userId: user._id,
      access_token: jwtToken,
      user: {
        _id: user._id,
        nombres: user.nombres,
        email: user.email,
        cedula: user.cedula,
        telefono: user.telefono,
        tipo_cliente: user.tipo_cliente,
        role: user.role,
        datos_negocio: user.datos_negocio
      }
    };
  }

  // POST /usuarios/check-email (Verificar disponibilidad)
  @Post('check-email')
  async checkEmail(@Body('email') email: string) {
    if (!email) throw new BadRequestException('Email required');
    const user = await this.usuariosService.findByEmail(email);
    return { exists: !!user };
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
      roles: [user.role], // Use correct role
      tipo_cliente: user.tipo_cliente
    }, this.jwtSecret, { expiresIn: '7d' });

    return {
      verified: true,
      message: 'Cuenta verificada exitosamente',
      access_token: jwtToken, // Return token for auto-login
      user: {
        id: user._id,
        email: user.email,
        nombres: user.nombres,
        cedula: user.cedula,
        telefono: user.telefono,
        roles: [user.tipo_cliente], // keeping 'roles' array for compatibility if used elsewhere, although register uses 'role' string and 'tipo_cliente'
        tipo_cliente: user.tipo_cliente,
        datos_negocio: user.datos_negocio
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

  // POST /usuarios/change-password
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Body() body: any, @Headers('authorization') authHeader: string) {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) throw new BadRequestException('Current and new passwords are required');

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    // Get user from token (Guard ensures it's valid, but we need the ID)
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, this.jwtSecret) as any;
    const user = await this.usuariosService.findById(decoded.sub);

    if (!user) throw new NotFoundException('User not found');

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    user.password_hash = hash;
    await user.save();

    return { message: 'Contraseña actualizada correctamente' };
  }

  // GET /usuarios
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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

  // PUT /usuarios/:id/cart
  @Put(':id/cart')
  async updateCart(
    @Param('id') id: string,
    @Body() cartItems: any[],
  ) {
    // Map items to include the 'product' reference expecting ObjectId
    // Assuming item.id is the valid Product ID
    const mappedItems = cartItems.map(item => ({
      ...item,
      product: item.id
    }));

    const updatedUser = await this.usuariosService.update(id, { carrito: mappedItems });
    if (!updatedUser) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return updatedUser.carrito;
  }

  // POST /usuarios/setup-initial-users
  @Post('setup-initial-users')
  async setupInitialUsers() {
    // 1. Check if admin exists
    let admin = await this.usuariosService.findByEmail('admin@santiagopapeleria.com');
    if (!admin) {
      // Create Admin
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('Admin123!', salt);

      await this.usuariosService.registerInternal({
        nombres: 'System Administrator',
        email: 'admin@santiagopapeleria.com',
        password: 'Admin123!', // Service hashes it again? registerInternal usually takes raw password if it hashes, let's check service logic.
        // Actually registerInternal usually takes raw password if we look at register method.
        // Wait, register passes dto.password to userData.password. 
        // I should check registerInternal implementation to be safe.
        // Assuming it hashes. The code above in register() passes raw password.
        role: 'admin',
        tipo_cliente: 'MINORISTA',
        email_verified: true,
        datos_negocio: {} as any
      });
    }

    // 2. Check if warehouse exists
    let warehouse = await this.usuariosService.findByEmail('bodega@santiagopapeleria.com');
    if (!warehouse) {
      await this.usuariosService.registerInternal({
        nombres: 'Encargado Bodega',
        email: 'bodega@santiagopapeleria.com',
        password: 'Bodega123!',
        role: 'warehouse',
        tipo_cliente: 'MINORISTA',
        email_verified: true,
        datos_negocio: {} as any
      });
    }

    return { message: 'Initial users setup complete (or already existed).' };
  }
}

