import { Controller, Get, Param, Query } from '@nestjs/common';
import { StockService } from './stock.service';

/**
 * InventoryController
 * 
 * Endpoints for inventory management.
 * Primarily used by admin and warehouse staff.
 */
@Controller('productos')
export class InventoryController {
    constructor(private readonly stockService: StockService) { }

    /**
     * GET /productos/admin/stats
     * Gets inventory statistics for dashboard.
     */
    @Get('admin/stats')
    async getInventoryStats() {
        return this.stockService.getInventoryStats();
    }

    /**
     * GET /productos/:sku/history
     * Gets stock movement history for a product.
     */
    @Get(':sku/history')
    async getProductHistory(@Param('sku') sku: string) {
        return this.stockService.getProductHistory(sku);
    }

    /**
     * GET /productos/admin/last-movements
     * Gets recent stock movements across all products.
     */
    @Get('admin/last-movements')
    async getLastMovements(@Query('limit') limit?: number) {
        return this.stockService.getLastMovements(limit || 20);
    }
}
