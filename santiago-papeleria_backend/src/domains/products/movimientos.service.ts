import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MovimientoStock, MovimientoStockDocument } from './schemas/movimiento-stock.schema';

@Injectable()
export class MovimientosService {
    constructor(
        @InjectModel(MovimientoStock.name) private movimientoModel: Model<MovimientoStockDocument>
    ) { }

    async registrarMovimiento(data: {
        producto_id: string;
        sku: string;
        tipo: 'VENTA' | 'SYNC_ERP' | 'DEVOLUCION' | 'AJUSTE_MANUAL';
        cantidad: number;
        stock_anterior: number;
        stock_nuevo: number;
        referencia: string;
        usuario_id?: string;
    }) {
        // If no change, do not log (except maybe for sales of 0? unlikely)
        if (data.stock_anterior === data.stock_nuevo) return;

        const movimiento = new this.movimientoModel(data);
        return movimiento.save();
    }

    async getHistorial(sku: string, limit = 20) {
        return this.movimientoModel.find({ sku })
            .sort({ fecha: -1 })
            .limit(limit)
            .lean()
            .exec();
    }

    async getUltimosMovimientos(limit = 20) {
        return this.movimientoModel.find()
            .sort({ fecha: -1 })
            .limit(limit)
            .populate('producto_id', 'nombre imagen') // Enrich with product details
            .lean()
            .exec();
    }
}
