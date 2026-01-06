import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('dashboard/today')
    async getDailySnapshot() {
        return this.reportsService.getDailySnapshot();
    }

    @Get('sales/range')
    async getSalesByDateRange(
        @Query('start') start: string,
        @Query('end') end: string,
    ) {
        return this.reportsService.getSalesByDateRange(start, end);
    }

    @Get('products/top')
    async getTopSellingProducts(
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('limit') limit?: number,
    ) {
        return this.reportsService.getTopSellingProducts(start, end, limit ? Number(limit) : 5);
    }
}
