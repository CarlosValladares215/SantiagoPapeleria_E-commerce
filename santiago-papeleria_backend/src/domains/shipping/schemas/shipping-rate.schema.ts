import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ShippingZone } from './shipping-zone.schema';

export type ShippingRateDocument = ShippingRate & Document;

@Schema({ timestamps: true })
export class ShippingRate {
    @Prop({ type: Types.ObjectId, ref: 'ShippingZone', required: true })
    zone_id: Types.ObjectId;

    @Prop({ required: true })
    min_weight: number; // kg

    @Prop({ required: true })
    max_weight: number; // kg

    @Prop({ required: true })
    price: number; // USD

    @Prop({ default: true })
    active: boolean;
}

export const ShippingRateSchema = SchemaFactory.createForClass(ShippingRate);
