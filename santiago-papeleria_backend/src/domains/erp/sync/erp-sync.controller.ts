import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ErpSyncService } from './erp-sync.service';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('erp-sync')
export class ErpSyncController {
    constructor(
        private readonly erpSyncService: ErpSyncService,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    // TEMPORARY: Endpoint to drop the problematic variantes.sku_1 index
    @Post('drop-variantes-index')
    async dropVariantesIndex() {
        try {
            const collection = this.connection.collection('productos');
            const indexes = await collection.indexes();
            const targetIndex = 'variantes.sku_1';
            const hasIndex = indexes.some((i: any) => i.name === targetIndex);

            if (hasIndex) {
                await collection.dropIndex(targetIndex);
                return { success: true, message: `Index "${targetIndex}" dropped successfully` };
            } else {
                return { success: true, message: `Index "${targetIndex}" not found - nothing to drop` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    @Get('test-connection')
    async testConnection() {
        return this.erpSyncService.testConnection();
    }

    @Get('dashboard-metrics')
    async getDashboardMetrics() {
        return this.erpSyncService.getDashboardMetrics();
    }

    @Get('logs')
    async getSyncLogs(@Query('limit') limit: number) {
        return this.erpSyncService.getSyncLogs(limit);
    }

    @Post('sync-now')
    async syncNow() {
        return this.erpSyncService.syncProducts('manual');
    }

    @Get('product')
    async getProduct(@Query('codigo') codigo: string) {
        return this.erpSyncService.getProductFromERP(codigo);
    }

    @Post('simulate-enrichment')
    async simulateEnrichment(@Query('codigo') codigo: string) {
        return this.erpSyncService.simulateEnrichment(codigo);
    }

    @Get('enriched-product')
    async getEnrichedProduct(@Query('codigo') codigo: string) {
        return this.erpSyncService.getEnrichedProduct(codigo);
    }

    @Get('raw-data')
    async getRawData() {
        return this.erpSyncService.fetchRawErpData();
    }
    @Get('config')
    async getConfig() {
        return this.erpSyncService.getConfig();
    }

    @Post('config')
    async updateConfig(@Body() config: any) {
        return this.erpSyncService.updateConfig(config);
    }

    @Post('sync-categories')
    async syncCategories() {
        return this.erpSyncService.syncCategories();
    }
}
