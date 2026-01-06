import { Test, TestingModule } from '@nestjs/testing';
import { PriceService } from './price.service';
import { Producto } from './schemas/producto.schema';

describe('PriceService', () => {
    let service: PriceService;

    // Datos simulados (Mock) para las pruebas
    // Usamos 'as any' para no tener que mockear todo el objeto Producto complejo,
    // solo lo que nos importa: los precios.
    const mockProduct = {
        nombre: 'Cuaderno Universitario',
        precios: {
            pvp: 1.50, // Precio Minorista
            pvm: 1.25, // Precio Mayorista
            moneda: 'USD',
            incluye_iva: true,
        },
    } as Producto;

    beforeEach(async () => {
        // Configuración del módulo de prueba (similar a un módulo real de NestJS pero aislado)
        const module: TestingModule = await Test.createTestingModule({
            providers: [PriceService],
        }).compile();

        service = module.get<PriceService>(PriceService);
    });

    it('debería estar definido', () => {
        expect(service).toBeDefined();
    });

    // CASO 1: Validación para usuario MINORISTA
    it('debería retornar el precio PVP cuando el usuario es minorista', () => {
        // Arrange (Organizar)
        const userType = 'minorista';

        // Act (Actuar)
        const result = service.getPrice(mockProduct, userType);

        // Assert (Afirmar)
        expect(result).toBe(1.50); // Debe ser igual al pvp del mock
    });

    // CASO 2: Validación para usuario MAYORISTA
    it('debería retornar el precio PVM cuando el usuario es mayorista', () => {
        // Arrange (Organizar)
        const userType = 'mayorista';

        // Act (Actuar)
        const result = service.getPrice(mockProduct, userType);

        // Assert (Afirmar)
        expect(result).toBe(1.25); // Debe ser igual al pvm del mock
    });
});
