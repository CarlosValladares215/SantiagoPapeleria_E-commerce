import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MovimientoStockDocument = MovimientoStock & Document;

@Schema({ timestamps: true })
export class MovimientoStock {
    @Prop({ type: Types.ObjectId, ref: 'Producto', required: true })
    producto_id: Types.ObjectId;

    @Prop({ required: true })
    sku: string;

    @Prop({ required: true, enum: ['VENTA', 'SYNC_ERP', 'DEVOLUCION', 'AJUSTE_MANUAL'] })
    tipo: string;

    @Prop({ required: true })
    cantidad: number; // Negativo para salidas, positivo para entradas

    @Prop({ required: true })
    stock_anterior: number;

    @Prop({ required: true })
    stock_nuevo: number;

    @Prop()
    referencia: string; // ID Pedido o 'SYNC_AUTO'

    @Prop()
    usuario_id?: string; // ID Admin o Cliente

    @Prop({ default: Date.now })
    fecha: Date;
}

export const MovimientoStockSchema = SchemaFactory.createForClass(MovimientoStock);
