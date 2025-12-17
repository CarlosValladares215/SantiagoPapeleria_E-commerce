import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ErpSyncService } from './erp-sync.service';

@Controller('erp-sync')
export class ErpSyncController {
    constructor(private readonly erpSyncService: ErpSyncService) { }

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
}
