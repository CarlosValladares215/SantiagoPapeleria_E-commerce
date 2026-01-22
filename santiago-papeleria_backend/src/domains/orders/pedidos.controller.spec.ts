import { Test, TestingModule } from '@nestjs/testing';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

describe('PedidosController', () => {
  let controller: PedidosController;
  let service: PedidosService;

  const mockPedidosService = {
    create: jest.fn(),
    requestReturn: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PedidosController],
      providers: [
        {
          provide: PedidosService,
          useValue: mockPedidosService,
        },
      ],
    }).compile();

    controller = module.get<PedidosController>(PedidosController);
    service = module.get<PedidosService>(PedidosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  /* describe('create', () => {
     it('debería crear un nuevo pedido', async () => {
       const dto: any = {
         usuario_id: 'user123',
         productos: [
           { producto_id: 'prod1', cantidad: 2, precio_unitario: 10, subtotal: 20 }
         ],
         total: 20,
         estado: 'PENDIENTE',
         direccion_entrega: 'Calle Falsa 123'
       };
 
       const expectedResult = { _id: 'order123', ...dto };
 
       mockPedidosService.create.mockResolvedValue(expectedResult);
 
       const result = await controller.create(dto);
 
       expect(result).toEqual(expectedResult);
       expect(service.create).toHaveBeenCalledWith(dto);
     });
   });*/

  /*describe('requestReturn', () => {
    it('debería solicitar una devolución exitosamente', async () => {
      const orderId = 'order123';
      const body = {
        userId: 'user123',
        items: [{ producto_id: 'prod1', cantidad: 1 }],
        motivo: 'Defective'
      };

      const expectedResult = { _id: orderId, status: 'RETURN_REQUESTED' };
      mockPedidosService.requestReturn.mockResolvedValue(expectedResult);

      const result = await controller.requestReturn(orderId, body);

      expect(result).toEqual(expectedResult);
      expect(service.requestReturn).toHaveBeenCalledWith(orderId, body.userId, {
        items: body.items,
        motivo: body.motivo
      });
    });

    it('debería lanzar ForbiddenException si los datos están incompletos', async () => {
      const orderId = 'order123';
      const body = { userId: 'user123' }; // Missing items and motive

      await expect(controller.requestReturn(orderId, body)).rejects.toThrow();
    });
  });*/

  describe('findOne (Tracking)', () => {
    it('debería retornar los detalles del pedido (información de rastreo)', async () => {
      const orderId = 'order123';
      const userId = 'user123';
      const mockOrder = {
        _id: orderId,
        usuario_id: { _id: userId }, // Simulated populated user
        estado: 'EN_CAMINO'
      };

      mockPedidosService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne(orderId, userId);

      expect(result).toEqual(mockOrder);
      expect((result as any).estado).toBe('EN_CAMINO');
      expect(service.findOne).toHaveBeenCalledWith(orderId);
    });

    it('debería lanzar ForbiddenException si el usuario no es dueño del pedido', async () => {
      const orderId = 'order123';
      const userId = 'user123';
      const mockOrder = {
        _id: orderId,
        usuario_id: { _id: 'otherUser' }, // Different user
        estado: 'PENDIENTE'
      };

      mockPedidosService.findOne.mockResolvedValue(mockOrder);

      await expect(controller.findOne(orderId, userId)).rejects.toThrow();
    });
  });
});
