import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShippingZoneDocument = ShippingZone & Document;

@Schema({ timestamps: true })
export class ShippingZone {
    @Prop({ required: true, unique: true })
    name: string; // e.g., "Costa", "Sierra", "Quito Urbano"

    @Prop({ type: [String], default: [] })
    provinces: string[]; // List of provinces/cities belonging to this zone

    @Prop({ default: 0 })
    multiplier: number; // Cost per km in USD (e.g., 0.05)

    @Prop({ default: true })
    active: boolean;
}

export const ShippingZoneSchema = SchemaFactory.createForClass(ShippingZone);
