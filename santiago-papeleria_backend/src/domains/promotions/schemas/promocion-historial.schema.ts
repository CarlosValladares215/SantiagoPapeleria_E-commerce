import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromocionHistorialDocument = PromocionHistorial & Document;

@Schema()
export class CambioPromocion {
    @Prop()
    campo: string;

    @Prop({ type: Object })
    valor_anterior: any;

    @Prop({ type: Object })
    valor_nuevo: any;
}

@Schema({ collection: 'promociones_historial' })
export class PromocionHistorial {
    @Prop({ type: Types.ObjectId, ref: 'Promocion', required: true })
    promocion_id: Types.ObjectId;

    @Prop({ required: true })
    accion: string; // 'creada' | 'editada' | 'desactivada' | 'eliminada'

    @Prop({ type: Types.ObjectId })
    usuario_id: Types.ObjectId;

    @Prop({ type: Object })
    datos_anteriores: any; // Snapshot completo

    @Prop({ type: [CambioPromocion] })
    cambios: CambioPromocion[];

    @Prop({ default: Date.now })
    fecha: Date;
}

export const PromocionHistorialSchema = SchemaFactory.createForClass(PromocionHistorial);
