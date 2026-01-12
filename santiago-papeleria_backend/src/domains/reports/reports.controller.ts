import { Controller, Get, Query, Post, Body, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('dashboard')
    async getDashboard(@Query('fecha') fecha: string) {
        return this.reportsService.getDashboardData(fecha);
    }

    @Get('productos-mas-vendidos')
    async getProductosMasVendidos(@Query('limit') limit: number) {
        return this.reportsService.getProductosMasVendidos(Number(limit) || 10);
    }

    @Get('recent-orders')
    async getRecentOrders(@Query('limit') limit: number) {
        return this.reportsService.getRecentOrders(Number(limit) || 20);
    }

    @Post('exportar')
    async exportarReporte(@Body() body: { format: 'pdf' | 'excel', range: string }, @Res() res) {
        const result = await this.reportsService.exportReport(body.format, body.range);

        if ((body.format === 'excel' || body.format === 'pdf') && Buffer.isBuffer(result)) {
            const contentType = body.format === 'excel'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'application/pdf';
            const filename = `reporte_ventas_${new Date().toISOString()}.${body.format === 'excel' ? 'xlsx' : 'pdf'}`;

            res.set({
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': result.length,
            });
            res.end(result);
        } else {
            res.json(result);
        }
    }
}
