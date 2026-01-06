import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { getModelToken } from '@nestjs/mongoose';
import { Usuario } from './schemas/usuario.schema';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let model: any;

  // 1. Mock del Modelo de Mongoose
  // Simulamos los métodos que usa el servicio (findOne -> exec)
  const mockUsuarioModel = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: getModelToken(Usuario.name), // Inyectamos el mock en lugar del modelo real
          useValue: mockUsuarioModel,
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    model = module.get(getModelToken(Usuario.name));
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  // --- PRUEBAS DE VALIDACIÓN DE USUARIO (LOGIN) ---
  describe('validateUser', () => {

    // CASO 1: Login Exitoso
    it('debería retornar el usuario si las credenciales son válidas', async () => {
      // Arrange
      const email = 'juan@test.com';
      const password = 'secreto_seguro';
      // Simulamos que la BD devuelve un usuario con el hash correcto
      // Recordar lógica actual: hash = "HASH_DE_" + password
      const userMock = {
        email,
        password_hash: 'HASH_DE_secreto_seguro',
        nombre: 'Juan Perez'
      };

      mockUsuarioModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMock),
      });

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toEqual(userMock);
    });

    // CASO 2: Usuario No Existe
    it('debería retornar null si el email no existe', async () => {
      // Arrange
      mockUsuarioModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // BD devuelve null
      });

      // Act
      const result = await service.validateUser('fantasma@test.com', '123456');

      // Assert
      expect(result).toBeNull();
    });

    // CASO 3: Contraseña Incorrecta
    it('debería retornar null si la contraseña es incorrecta', async () => {
      // Arrange
      const email = 'juan@test.com';
      const passwordIncorrecta = '123456'; // Esta generaría HASH_DE_123456
      const userMock = {
        email,
        password_hash: 'HASH_DE_secreto_seguro', // El usuario tiene otra clave
      };

      mockUsuarioModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(userMock),
      });

      // Act
      const result = await service.validateUser(email, passwordIncorrecta);

      // Assert
      expect(result).toBeNull();
    });

  });
});
