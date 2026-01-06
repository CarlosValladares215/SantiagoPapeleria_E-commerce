
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShippingConfigDocument = ShippingConfig & Document;

@Schema({ timestamps: true })
export class ShippingConfig {
    @Prop({ required: true, default: 2.50 })
    baseRate: number;

    @Prop({ required: true, default: 0.35 })
    ratePerKm: number;

    @Prop({ required: true, default: 0.25 })
    ratePerKg: number;

    @Prop({ default: 0.15 })
    ivaRate: number;

    @Prop({ required: true, default: true })
    isActive: boolean;
}

export const ShippingConfigSchema = SchemaFactory.createForClass(ShippingConfig);
