import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as ExcelJS from 'exceljs';
import { Pedido, PedidoStatus } from '../orders/schemas/pedido.schema';
import { Producto } from '../products/schemas/producto.schema';
import { ReportsPdfService } from './reports-pdf.service';

const PAID_STATUSES = ['PAGADO', 'Pagado', 'ENTREGADO', 'Entregado', 'ENVIADO', 'Enviado'];
const PROJECT_START_DATE = new Date('2020-01-01');

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(
        @InjectModel(Pedido.name) private pedidoModel: Model<Pedido>,
        @InjectModel(Producto.name) private productoModel: Model<Producto>,
        private reportsPdfService: ReportsPdfService,
    ) { }

    async getDashboardData(fecha: string = 'hoy') {
        const { start, end } = this.getDateRange(fecha);
        const { start: prevStart, end: prevEnd } = this.getPreviousDateRange(fecha, start);

        const [ingresos, prevIngresos, pedidos, prevPedidos, salesTrend] = await Promise.all([
            this.calculateTotalRevenue(start, end),
            this.calculateTotalRevenue(prevStart, prevEnd),
            this.calculateTotalOrders(start, end),
            this.calculateTotalOrders(prevStart, prevEnd),
            this.calculateSalesTrend(start, end)
        ]);

        const ticketPromedio = pedidos > 0 ? ingresos / pedidos : 0;
        const prevTicket = prevPedidos > 0 ? prevIngresos / prevPedidos : 0;

        return {
            ingresos: { value: ingresos, change: this.calculatePercentageChange(ingresos, prevIngresos) },
            pedidos: { value: pedidos, change: this.calculatePercentageChange(pedidos, prevPedidos) },
            ticketPromedio: { value: ticketPromedio, change: this.calculatePercentageChange(ticketPromedio, prevTicket) },
            salesTrend,
            lastUpdate: new Date()
        };
    }

    private getPreviousDateRange(range: string, currentStart: Date): { start: Date, end: Date } {
        const start = new Date(currentStart);
        const end = new Date(currentStart);

        if (range === 'hoy' || range === 'ayer') {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
        } else if (range === '7d') {
            start.setDate(start.getDate() - 7);
            end.setDate(end.getDate() - 1);
        } else if (range === '30d') {
            start.setDate(start.getDate() - 30);
            end.setDate(end.getDate() - 1);
        } else if (range === 'all') {
            start.setTime(PROJECT_START_DATE.getTime());
            end.setTime(PROJECT_START_DATE.getTime());
        } else {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    private calculatePercentageChange(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }

    async getProductosMasVendidos(limit: number = 10, categoria?: string) {
        const matchStage: any = {};
        if (categoria && categoria !== 'Todas') {
            // Assuming products collection might be joined or we filter differently.
            // For now, let's keep it simple.
        }

        return this.pedidoModel.aggregate([
            { $match: { estado_pedido: { $in: PAID_STATUSES } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.producto',
                    nombre_snapshot: { $first: '$items.nombre' },
                    unidades: { $sum: '$items.cantidad' },
                    ingresos: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { unidades: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'productos',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'producto_info'
                }
            },
            { $unwind: { path: '$producto_info', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    nombre: { $ifNull: ['$producto_info.nombre', '$nombre_snapshot', 'Producto Desconocido'] },
                    unidades: 1,
                    ingresos: 1
                }
            }
        ]);
    }

    private getDateRange(fecha: string): { start: Date, end: Date } {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        if (fecha === 'ayer') {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (fecha === '7d') {
            start.setDate(start.getDate() - 7);
        } else if (fecha === '30d') {
            start.setDate(start.getDate() - 30);
        } else if (fecha === 'all') {
            start.setTime(PROJECT_START_DATE.getTime());
        }

        return { start, end };
    }

    private async calculateTotalRevenue(start: Date, end: Date): Promise<number> {
        const result = await this.pedidoModel.aggregate([
            {
                $match: {
                    fecha_compra: { $gte: start, $lte: end },
                    estado_pedido: { $in: PAID_STATUSES }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$resumen_financiero.total_pagado' }
                }
            }
        ]);
        return result.length > 0 ? result[0].total : 0;
    }

    private async calculateTotalOrders(start: Date, end: Date): Promise<number> {
        return this.pedidoModel.countDocuments({
            fecha_compra: { $gte: start, $lte: end },
            estado_pedido: { $in: PAID_STATUSES }
        });
    }

    private async calculateSalesTrend(start: Date, end: Date) {
        const result = await this.pedidoModel.aggregate([
            {
                $match: {
                    fecha_compra: { $gte: start, $lte: end },
                    estado_pedido: { $in: PAID_STATUSES }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$fecha_compra" } },
                    total: { $sum: "$resumen_financiero.total_pagado" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return {
            labels: result.map(r => r._id),
            data: result.map(r => r.total)
        };
    }

    async getRecentOrders(limit: number = 20) {
        try {
            return await this.pedidoModel.find()
                .sort({ _id: -1 })
                .limit(limit)
                .populate('usuario_id', 'nombre apellido email')
                .exec();
        } catch (err) {
            this.logger.error(`ERROR in getRecentOrders: ${err.message}`);
            return [];
        }
    }

    async exportReport(format: 'pdf' | 'excel', range: string) {
        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte Ventas');

            worksheet.columns = [
                { header: 'ID Pedido', key: 'id', width: 10 },
                { header: 'Fecha', key: 'fecha', width: 20 },
                { header: 'Cliente', key: 'cliente', width: 30 },
                { header: 'Total', key: 'total', width: 15 },
                { header: 'Estado', key: 'estado', width: 15 }
            ];

            const orders = await this.getRecentOrders(100); // Export last 100 orders for now

            orders.forEach(order => {
                worksheet.addRow({
                    id: order.numero_pedido_web,
                    fecha: order['fecha_compra'],
                    cliente: order['usuario_id'] ? `${order['usuario_id']['nombre']} ${order['usuario_id']['apellido']}` : 'Cliente',
                    total: order.resumen_financiero.total_pagado,
                    estado: order.estado_pedido
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            return buffer;
        }

        if (format === 'pdf') {
            const { start, end } = this.getDateRange(range);
            const ingresos = await this.calculateTotalRevenue(start, end);
            const totalPedidos = await this.calculateTotalOrders(start, end);
            const ticketPromedio = totalPedidos > 0 ? ingresos / totalPedidos : 0;
            const recentOrders = await this.getRecentOrders(50);

            const pdfData = {
                range,
                ingresos,
                totalPedidos,
                ticketPromedio,
                recentOrders
            };

            return this.reportsPdfService.generateSalesPdf(pdfData);
        }

        return null;
    }
}
