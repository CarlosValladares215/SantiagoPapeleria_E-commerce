
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: Types.ObjectId, ref: 'Usuario', required: true })
    usuario_id: Types.ObjectId;

    @Prop({ required: true })
    titulo: string;

    @Prop({ required: true })
    mensaje: string;

    @Prop({ default: 'order_status' })
    tipo: string;

    @Prop({ default: false })
    leido: boolean;

    @Prop({ type: Object })
    metadata: any; // e.g., { orderId: '...' }
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
