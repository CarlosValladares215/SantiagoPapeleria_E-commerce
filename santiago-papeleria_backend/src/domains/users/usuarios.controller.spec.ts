import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { EmailService } from './services/email.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  let service: UsuariosService;
  let emailService: EmailService;

  const mockUsuariosService = {
    findByEmail: jest.fn(),
    findByCedula: jest.fn(),
    registerInternal: jest.fn(),
    findById: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock_secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        { provide: UsuariosService, useValue: mockUsuariosService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
    service = module.get<UsuariosService>(UsuariosService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('debería registrar exitosamente un usuario y retornar access_token', async () => {
      const dto = {
        name: 'Test',
        email: 'test@test.com',
        password: 'password123',
        client_type: 'MINORISTA',
        telefono: '0999999999',
        direcciones_entrega: [],
        datos_negocio: {},
        cedula: '1100110011'
      };

      const mockUser = {
        _id: 'mock_id',
        nombres: dto.name,
        email: dto.email,
        role: 'customer',
        tipo_cliente: dto.client_type,
        save: jest.fn()
      };

      mockUsuariosService.findByEmail.mockResolvedValue(null);
      mockUsuariosService.findByCedula.mockResolvedValue(null);
      mockUsuariosService.registerInternal.mockResolvedValue(mockUser);
      mockEmailService.sendVerificationEmail.mockResolvedValue(true);

      const result = await controller.register(dto as any);

      expect(result).toHaveProperty('access_token');
      expect(result.user).toHaveProperty('email', dto.email);
      expect(service.registerInternal).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si el email existe', async () => {
      const dto = { name: 'Test', email: 'existing@test.com', password: '123' };
      mockUsuariosService.findByEmail.mockResolvedValue({ _id: 'existing' });

      await expect(controller.register(dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('debería retornar access_token para credenciales válidas', async () => {
      const dto = { email: 'valid@test.com', password: 'password123' };
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const mockUser = {
        _id: 'user_id',
        email: dto.email,
        password_hash: hashedPassword,
        email_verified: true,
        save: jest.fn(),
      };

      mockUsuariosService.findByEmail.mockResolvedValue(mockUser);

      const result = await controller.login(dto);
      expect(result).toHaveProperty('access_token');
    });

    it('debería lanzar UnauthorizedException para contraseña inválida', async () => {
      const dto = { email: 'valid@test.com', password: 'wrongpassword' };
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      const mockUser = {
        _id: 'user_id',
        email: dto.email,
        password_hash: hashedPassword,
        email_verified: true,
        save: jest.fn(), // for failing attempts logic
      };

      mockUsuariosService.findByEmail.mockResolvedValue(mockUser);

      await expect(controller.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
