import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductERP, ProductERPDocument } from '../schemas/product-erp.schema';
import { Producto, ProductoDocument } from '../schemas/producto.schema';
import { MovimientosService } from './movimientos.service';

/**
 * StockService
 * 
 * Handles inventory-related operations:
 * - Stock statistics
 * - Stock updates (for order processing)
 * - Stock movement history delegation
 * 
 * Single Responsibility: Stock/Inventory management
 */
@Injectable()
export class StockService {
    private readonly logger = new Logger(StockService.name);

    constructor(
        @InjectModel(ProductERP.name) private productErpModel: Model<ProductERPDocument>,
        @InjectModel(Producto.name) private productoModel: Model<ProductoDocument>,
        private readonly movimientosService: MovimientosService,
    ) { }

    /**
     * Gets inventory statistics for dashboard.
     */
    async getInventoryStats(): Promise<any> {
        const [totalProducts, lowStock, outOfStock, normalStock] = await Promise.all([
            this.productErpModel.countDocuments({ activo: true }),
            this.productErpModel.countDocuments({ activo: true, stock: { $gt: 0, $lte: 5 } }),
            this.productErpModel.countDocuments({ activo: true, stock: 0 }),
            this.productErpModel.countDocuments({ activo: true, stock: { $gt: 5 } }),
        ]);

        return {
            total: totalProducts,
            lowStock,
            outOfStock,
            normalStock,
            timestamp: new Date(),
        };
    }

    /**
     * Updates stock for a product.
     * Used by OrdersService when processing orders.
     * 
     * @param sku Product SKU
     * @param delta Change in stock (negative for reduction)
     * @param reference Order ID or reference
     * @param type Movement type
     * @param userId User causing the change
     */
    async updateStock(
        sku: string,
        delta: number,
        reference: string,
        type: 'VENTA' | 'DEVOLUCION' | 'AJUSTE_MANUAL',
        userId?: string,
    ): Promise<void> {
        const erpProduct = await this.productErpModel.findOne({ codigo: sku });

        if (!erpProduct) {
            this.logger.warn(`[Stock] Product SKU ${sku} not found in ERP Collection`);
            return;
        }

        const oldStock = Number(erpProduct.stock) || 0;
        const newStock = oldStock + delta;

        if (oldStock === newStock) {
            return; // No change needed
        }

        // Update ERP product
        erpProduct.stock = newStock;
        await erpProduct.save();

        // Update enriched product cache
        const enriched = await this.productoModel.findOne({ codigo_interno: sku });
        if (enriched) {
            enriched.stock.total_disponible = newStock;
            enriched.stock.estado_stock = this.calculateStockStatus(
                newStock,
                enriched.stock.umbral_stock_alerta || 5,
            );
            await enriched.save();
        }

        // Log movement
        try {
            await this.movimientosService.registrarMovimiento({
                producto_id: (enriched?._id || erpProduct._id) as any,
                sku,
                tipo: type,
                cantidad: delta,
                stock_anterior: oldStock,
                stock_nuevo: newStock,
                referencia: reference,
                usuario_id: userId,
            });
        } catch (logErr) {
            this.logger.error(`[Stock] Error logging movement for ${sku}:`, logErr);
        }
    }

    /**
     * Gets stock movement history for a product.
     */
    async getProductHistory(sku: string): Promise<any[]> {
        return this.movimientosService.getHistorial(sku);
    }

    /**
     * Gets recent stock movements across all products.
     */
    async getLastMovements(limit = 20): Promise<any[]> {
        return this.movimientosService.getUltimosMovimientos(limit);
    }

    // --- Private helpers ---

    private calculateStockStatus(quantity: number, threshold: number): string {
        if (quantity <= 0) return 'agotado';
        if (quantity <= threshold) return 'bajo';
        return 'normal';
    }
}
