import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from '../src/domains/users/usuarios.controller';
import { UsuariosService } from '../src/domains/users/usuarios.service';
import { EmailService } from '../src/domains/users/services/email.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

// Imports for Orders
import { PedidosController } from '../src/domains/orders/pedidos.controller';
import { PedidosService } from '../src/domains/orders/pedidos.service';
import { ContadoresService } from '../src/core/counters/contadores.service';
import { NotificationsService } from '../src/domains/notifications/notifications.service';
import { StockService } from '../src/domains/products/inventory/stock.service';
import { ErpSyncService } from '../src/domains/erp/sync/erp-sync.service';

describe('Integration Tests: Full E2E Scenarios', () => {
    let moduleRef: TestingModule;
    let usuariosController: UsuariosController;
    let pedidosController: PedidosController;

    // Mock Databases
    let mockUserDb: any[] = [];
    let mockPedidoDb: any[] = [];

    // --- MOCK MODELS ---
    const createMockModel = (db) => {
        return class MockModel {
            constructor(public data: any) {
                Object.assign(this, data);
            }
            save = jest.fn().mockImplementation(() => {
                // Simulate ID generation if not present
                if (!this['_id']) (this as any)._id = 'gen_id_' + Math.random();
                db.push(this);
                return Promise.resolve(this);
            });
            static findOne = jest.fn().mockImplementation((query) => {
                const item = db.find(u => {
                    return Object.keys(query).every(k => u[k] === query[k]);
                });
                if (!item) return { exec: () => null };
                return {
                    exec: () => ({
                        ...item,
                        save: jest.fn().mockImplementation(function () {
                            // Update item in DB reference if needed, or just return self
                            Object.assign(item, this);
                            return Promise.resolve(this);
                        }),
                        populate: jest.fn().mockReturnThis()
                    })
                };
            });
            static findById = jest.fn().mockImplementation((id) => {
                const item = db.find(u => u._id === id || (u as any)._id?.toString() === id);
                if (!item) return { populate: jest.fn().mockReturnThis(), exec: () => null };

                // Simulate Mongoose Document instance
                const doc = {
                    ...item,
                    save: jest.fn().mockImplementation(function () {
                        Object.assign(item, this); // Update "DB"
                        return Promise.resolve(this);
                    }),
                    populate: jest.fn().mockImplementation((path) => {
                        // Very basic populate mock for 'usuario_id'
                        if (path === 'usuario_id' && typeof item.usuario_id === 'string') {
                            const user = mockUserDb.find(u => u._id === item.usuario_id);
                            if (user) {
                                (doc as any).usuario_id = { ...user, _id: item.usuario_id };
                            }
                        }
                        return { exec: () => doc };
                    }),
                    exec: () => doc
                };
                return { populate: jest.fn().mockReturnThis(), exec: () => doc };
            });
            static create = jest.fn().mockImplementation((dto) => {
                const instance = new MockModel(dto);
                return instance.save();
            });
            static find = jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                exec: () => db
            });
            static updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });
        }
    }

    const MockUsuarioModel = createMockModel(mockUserDb);
    const MockPedidoModel = createMockModel(mockPedidoDb);

    // --- MOCK SERVICES ---
    const mockEmailService = {
        sendVerificationEmail: jest.fn().mockResolvedValue(true),
        sendOrderConfirmation: jest.fn().mockResolvedValue(true),
    };
    const mockConfigService = {
        get: jest.fn().mockReturnValue('test_secret'),
    };
    const mockContadoresService = {
        getNextSequenceValue: jest.fn().mockResolvedValue(1001)
    };
    const mockNotificationsService = {
        create: jest.fn().mockResolvedValue(true)
    };
    const mockStockService = {
        updateStock: jest.fn().mockResolvedValue(true)
    };
    const mockErpSyncService = {
        sendOrderToERP: jest.fn().mockResolvedValue({ STA: 'OK', 'ORDVEN-NUM': 'ERP-1001' })
    };

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            controllers: [UsuariosController, PedidosController],
            providers: [
                UsuariosService,
                PedidosService,
                { provide: EmailService, useValue: mockEmailService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: ContadoresService, useValue: mockContadoresService },
                { provide: NotificationsService, useValue: mockNotificationsService },
                { provide: StockService, useValue: mockStockService },
                { provide: ErpSyncService, useValue: mockErpSyncService },
                { provide: getModelToken('Usuario'), useValue: MockUsuarioModel },
                { provide: getModelToken('Pedido'), useValue: MockPedidoModel },
            ],
        }).compile();

        usuariosController = moduleRef.get<UsuariosController>(UsuariosController);
        pedidosController = moduleRef.get<PedidosController>(PedidosController);
    });

    beforeEach(() => {
        mockUserDb.length = 0;
        mockPedidoDb.length = 0;
        jest.clearAllMocks();
    });

    // 1. REGISTER
    it('INTEGRATION: User Register', async () => {
        const registerDto = {
            name: 'Integration User',
            email: 'integration@test.com',
            password: 'password123',
            client_type: 'MINORISTA',
            telefono: '0991234567',
            cedula: '1100110011',
            direcciones_entrega: [],
            datos_negocio: {}
        };

        const result = await usuariosController.register(registerDto as any);
        expect(result).toHaveProperty('access_token');

        const dbUser = mockUserDb.find(u => u.email === registerDto.email);
        expect(dbUser).toBeDefined();
        // Verify password was hashed
        expect((dbUser as any).password_hash).toBeDefined();
        expect((dbUser as any).password_hash).not.toBe(registerDto.password);
    });

    // 2. LOGIN
    it('INTEGRATION: User Login', async () => {
        // Seed DB
        const password = 'mySecretPassword';
        const hashedPassword = await bcrypt.hash(password, 10);
        mockUserDb.push({
            _id: 'user123',
            email: 'login@test.com',
            password_hash: hashedPassword,
            nombres: 'Login User',
            email_verified: true,
            role: 'customer',
            tipo_cliente: 'MINORISTA'
        });

        const result = await usuariosController.login({ email: 'login@test.com', password: password });
        expect(result).toHaveProperty('access_token');
    });

    // 3. PURCHASE
    it('INTEGRATION: Make a Purchase', async () => {
        // Create User first
        const userId = '507f1f77bcf86cd799439011';
        mockUserDb.push({ _id: userId, email: 'buyer@test.com' });

        const orderDto = {
            usuario_id: userId,
            items: [{ codigo_dobranet: 'P01', cantidad: 2, precio_unitario: 10, precio_unitario_aplicado: 10 }],
            resumen_financiero: { total_pagado: 20 },
            datos_envio: { direccion: 'Test Address' }
        };

        const result = await pedidosController.create(orderDto as any);

        expect(result).toHaveProperty('numero_pedido_web', 1001);
        expect(result.datos_envio.guia_tracking).toContain('GUIA-');

        // Verify DB Interaction
        // Service.create generates a new ID. We can find by numero_pedido_web (1001)
        const storedOrder = mockPedidoDb.find(o => o.numero_pedido_web === 1001);
        expect(storedOrder).toBeDefined();
        // Since we mocked Model.save to generate random ID if missing, result._id might be random string or whatever mock does.
        // But mockModel.save logic: if(!this['_id']) (this as any)._id = 'gen_id_' + Math.random();
        // Wait, 'gen_id_...' is NOT a valid ObjectId. If code uses Types.ObjectId(id) later it might fail.
        // Service uses savedPedido.items... and savedPedido.usuario_id.
        // It doesn't seem to cast the ID of the Order itself to ObjectId immediately in the Create flow shown.
        // But for safety, let's update mockModel logic to generate valid ObjectId-like strings if needed?
        // Service code: await createdPedido.save(). Then accesses properties.

        expect(mockStockService.updateStock).toHaveBeenCalled();
        expect(mockErpSyncService.sendOrderToERP).toHaveBeenCalled();
    });

    // 4. RETURN
    it('INTEGRATION: Request Return', async () => {
        // Use valid ObjectIds
        const orderId = '507f1f77bcf86cd799439022';
        const userId = '507f1f77bcf86cd799439011';

        mockPedidoDb.push({
            _id: orderId,
            usuario_id: userId,
            estado_pedido: 'ENTREGADO',
            numero_pedido_web: 2002,
            fecha_entrega: new Date()
        });

        const body = {
            userId: userId,
            items: [],
            motivo: 'Defective'
        };

        const result = await pedidosController.requestReturn(orderId, body);

        expect(result.estado_pedido).toBe('PENDIENTE_REVISION');

        // Verify DB updated
        const dbOrder = mockPedidoDb.find(o => o._id === orderId);
        expect(dbOrder.estado_pedido).toBe('PENDIENTE_REVISION');
    });

    // 5. TRACKING (FindOne)
    it('INTEGRATION: Order Tracking', async () => {
        const orderId = '507f1f77bcf86cd799439033';
        const userId = '507f1f77bcf86cd799439011';

        mockPedidoDb.push({
            _id: orderId,
            usuario_id: userId,
            estado_pedido: 'EN_CAMINO',
            numero_pedido_web: 3003
        });
        mockUserDb.push({ _id: userId, email: 'owner@test.com' });

        const result = await pedidosController.findOne(orderId, userId);

        expect(result._id).toBe(orderId);
        expect((result as any).estado_pedido).toBe('EN_CAMINO');
    });

});
