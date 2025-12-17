import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SyncLogDocument = SyncLog & Document;

@Schema({ timestamps: { createdAt: 'timestamp', updatedAt: false } })
export class SyncLog {
    @Prop({ required: true, enum: ['success', 'error', 'partial'] })
    status: string;

    @Prop({ required: true })
    startTime: Date;

    @Prop()
    endTime: Date;

    @Prop()
    duration: string; // e.g. "12.5s"

    @Prop({ default: 0 })
    productsProcessed: number;

    @Prop({ default: 0 })
    productsCreated: number;

    @Prop({ default: 0 })
    productsUpdated: number;

    @Prop({ type: [String], default: [] })
    errors: string[];

    @Prop({ default: 'manual' })
    triggeredBy: string; // 'manual' | 'cron'
}

export const SyncLogSchema = SchemaFactory.createForClass(SyncLog);
