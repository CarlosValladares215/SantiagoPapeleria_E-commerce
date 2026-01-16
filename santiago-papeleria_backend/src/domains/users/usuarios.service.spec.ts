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
  // validateUser was removed as logic moved to Controller with bcrypt.
});
