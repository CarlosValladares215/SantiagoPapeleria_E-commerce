import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentConfigDocument = PaymentConfig & Document;

@Schema()
export class BankAccount {
    @Prop({ required: true })
    bankName: string;

    @Prop({ required: true })
    type: string; // 'Ahorros' | 'Corriente'

    @Prop({ required: true })
    accountNumber: string;

    @Prop({ required: true })
    ownerName: string;

    @Prop({ required: true })
    ownerId: string; // RUC or CI

    @Prop({ default: true })
    isActive: boolean;
}

const BankAccountSchema = SchemaFactory.createForClass(BankAccount);

@Schema()
export class CashConfig {
    @Prop({ required: true, default: 100 })
    maxAmount: number;

    @Prop()
    restrictedZones: string[]; // List of zone IDs or names where cash is allowed/restricted
}

const CashConfigSchema = SchemaFactory.createForClass(CashConfig);

@Schema({ timestamps: true })
export class PaymentConfig {
    // Methods Toggles
    @Prop({ default: true })
    transferActive: boolean;

    @Prop({ default: false })
    cashActive: boolean;

    @Prop({ default: true })
    pickupActive: boolean;

    // Config Details
    @Prop({ type: [BankAccountSchema], default: [] })
    bankAccounts: BankAccount[];

    @Prop({ type: CashConfigSchema, default: {} })
    cashConfig: CashConfig;
}

export const PaymentConfigSchema = SchemaFactory.createForClass(PaymentConfig);
