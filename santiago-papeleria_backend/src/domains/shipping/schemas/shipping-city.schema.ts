import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShippingCityDocument = ShippingCity & Document;

@Schema({ timestamps: true })
export class ShippingCity {
    @Prop({ required: true, unique: true })
    name: string; // e.g., "Quito", "Guayaquil"

    @Prop({ required: true })
    province: string; // e.g., "Pichincha"

    @Prop({ required: true, default: 0 })
    distance_km: number; // Approximate distance from Loja

    @Prop({ default: false })
    is_custom_rate: boolean; // If true, ignores zone calculation calculates fixed price

    @Prop({ required: false })
    custom_price: number; // Only used if is_custom_rate is true

    @Prop({ type: Object, required: false })
    coordinates: { lat: number; lng: number };
}

export const ShippingCitySchema = SchemaFactory.createForClass(ShippingCity);
