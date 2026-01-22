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

    async getProductosMasVendidos(limit: number = 10, categoria?: string, fecha: string = 'all') {
        const { start, end } = this.getDateRange(fecha);

        const matchStage: any = {
            estado_pedido: { $in: PAID_STATUSES },
            fecha_compra: { $gte: start, $lte: end }
        };

        if (categoria && categoria !== 'Todas') {
            // Assuming products collection might be joined or we filter differently.
            // For now, let's keep it simple.
        }

        return this.pedidoModel.aggregate([
            { $match: matchStage },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.nombre', // Group by NAME (Fixes null ID bug)
                    nombre_snapshot: { $first: '$items.nombre' },
                    unidades: { $sum: '$items.cantidad' },
                    ingresos: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { unidades: -1 } },
            { $limit: limit },
            // No lookup needed if we rely on snapshot name, which is safer for history
            {
                $project: {
                    _id: 0,
                    nombre: '$_id',
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

    async getRecentOrders(page: number = 1, limit: number = 20, status?: string, customerType?: string, paymentStatus?: string) {
        try {
            const skip = (page - 1) * limit;
            const matchStage: any = {};

            // Filter by Logistic Status
            if (status && status !== 'Todos') {
                matchStage.estado_pedido = status;
            }

            // Filter by Payment Status (New)
            if (paymentStatus && paymentStatus !== 'Todos') {
                matchStage.estado_pago = paymentStatus;
            }

            // Aggregation Pipeline
            const pipeline: any[] = [
                { $match: matchStage },
                { $sort: { fecha_compra: -1 } }, // Newest first
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'usuario_id',
                        foreignField: '_id',
                        as: 'usuario_info'
                    }
                },
                { $unwind: { path: '$usuario_info', preserveNullAndEmptyArrays: true } }
            ];

            // Filter by Customer Type (Requires Lookup first)
            if (customerType && customerType !== 'Todos') {
                pipeline.push({
                    $match: { 'usuario_info.tipo_cliente': customerType }
                });
            }

            // Count Total (for Pagination)
            // We need a separate count query or use facet. Facet is cleaner here.
            const facetPipeline = [
                ...pipeline,
                {
                    $facet: {
                        metadata: [{ $count: "total" }],
                        data: [
                            { $skip: skip },
                            { $limit: limit },
                            // Clean up the output to match previous structure or enhanced one
                            {
                                $project: {
                                    numero_pedido_web: 1,
                                    fecha_compra: 1,
                                    estado_pedido: 1,
                                    estado_pago: 1,
                                    estado_devolucion: 1,
                                    resumen_financiero: 1,
                                    'usuario_id.nombre': '$usuario_info.nombre',
                                    'usuario_id.apellido': '$usuario_info.apellido',
                                    'usuario_id.email': '$usuario_info.email',
                                    'usuario_id.telefono': '$usuario_info.telefono',
                                    'usuario_id.razon_social': '$usuario_info.datos_fiscales.razon_social',
                                    'usuario_id.identificacion': '$usuario_info.datos_fiscales.identificacion',
                                    'usuario_id.direccion_fiscal': '$usuario_info.datos_fiscales.direccion_matriz',
                                    'usuario_id.tipo_cliente': '$usuario_info.tipo_cliente',
                                    items: 1,
                                    datos_envio: 1
                                }
                            }
                        ]
                    }
                }
            ];

            const result = await this.pedidoModel.aggregate(facetPipeline);

            const metadata = result[0].metadata[0];
            const total = metadata ? metadata.total : 0;
            const data = result[0].data;

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };

        } catch (err) {
            this.logger.error(`ERROR in getRecentOrders: ${err.message}`);
            return { data: [], total: 0, page: 1, limit, totalPages: 0 };
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

            const result = await this.getRecentOrders(1, 1000); // Export last 1000 orders
            const orders = result.data;

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
