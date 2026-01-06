import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pedido, PedidoDocument } from '../orders/schemas/pedido.schema';

@Injectable()
export class ReportsService {
    constructor(
        @InjectModel(Pedido.name) private pedidoModel: Model<PedidoDocument>,
    ) { }

    async getDailySnapshot() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const result = await this.pedidoModel.aggregate([
            {
                $match: {
                    fecha_compra: { $gte: startOfDay, $lte: endOfDay },
                    estado_pedido: { $in: ['PAGADO', 'ENVIADO', 'ENTREGADO', 'COMPLETADO'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$resumen_financiero.total_pagado' },
                    totalOrders: { $count: {} },
                    avgTicket: { $avg: '$resumen_financiero.total_pagado' }
                }
            }
        ]);

        return result[0] || { totalRevenue: 0, totalOrders: 0, avgTicket: 0 };
    }

    async getSalesByDateRange(start: string, end: string) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);

        return this.pedidoModel.aggregate([
            {
                $match: {
                    fecha_compra: { $gte: startDate, $lte: endDate },
                    estado_pedido: { $in: ['PAGADO', 'ENVIADO', 'ENTREGADO', 'COMPLETADO'] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha_compra' } },
                    totalSales: { $sum: '$resumen_financiero.total_pagado' },
                    orderCount: { $count: {} }
                }
            },
            { $sort: { _id: 1 } }
        ]);
    }

    async getTopSellingProducts(start: string, end: string, limit: number = 5) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);

        return this.pedidoModel.aggregate([
            {
                $match: {
                    fecha_compra: { $gte: startDate, $lte: endDate },
                    estado_pedido: { $in: ['PAGADO', 'ENVIADO', 'ENTREGADO', 'COMPLETADO'] }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.codigo_dobranet',
                    name: { $first: '$items.nombre' },
                    totalSold: { $sum: '$items.cantidad' },
                    revenue: { $sum: '$items.subtotal' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: limit }
        ]);
    }
}
