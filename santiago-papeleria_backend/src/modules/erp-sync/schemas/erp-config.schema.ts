
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ErpConfig extends Document {
    @Prop({ required: true, default: 'https://api.dobranet.com' })
    baseUrl: string;

    @Prop({ required: false, default: '' })
    authToken: string;

    @Prop({ required: false, default: '' })
    webhookSecret: string;

    @Prop({ required: false, default: '' })
    webhookUrl: string;

    @Prop({ default: true })
    autoSync: boolean;

    @Prop({ default: '02:00' })
    dailySyncTime: string;

    @Prop({ default: 'GMT-5' })
    timezone: string;

    @Prop({ default: false })
    notifySuccess: boolean;

    @Prop({ default: true })
    notifyErrors: boolean;

    @Prop({ default: '' })
    alertEmail: string;

    @Prop({ default: true })
    includeDetailedLogs: boolean;

    @Prop({ default: false })
    sendDailySummary: boolean;

    @Prop({ default: 30 })
    timeout: number;

    @Prop({ default: 3 })
    retries: number;

    @Prop({ default: true })
    validateSSL: boolean;

    @Prop({ default: true })
    logRequestsResponses: boolean;
}

export const ErpConfigSchema = SchemaFactory.createForClass(ErpConfig);
