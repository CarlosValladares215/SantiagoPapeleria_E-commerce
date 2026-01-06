import { Injectable } from '@nestjs/common';
import { Producto } from './schemas/producto.schema';

@Injectable()
export class PriceService {
    /**
     * Calcula el precio correcto del producto basado en el tipo de usuario.
     * 
     * Regla de Negocio:
     * - Usuario 'minorista' -> Retorna Precio de Venta al Público (PVP)
     * - Usuario 'mayorista' -> Retorna Precio de Venta al Mayor (PVM)
     * 
     * @param product El producto del cual obtener el precio
     * @param userType El tipo de usuario ('minorista' | 'mayorista')
     * @returns El precio numérico correspondiente
     */
    getPrice(product: Producto, userType: 'minorista' | 'mayorista'): number {
        if (userType === 'mayorista') {
            return product.precios.pvm;
        }
        // Por defecto o si es minorista, retornamos pvp
        return product.precios.pvp;
    }
}
