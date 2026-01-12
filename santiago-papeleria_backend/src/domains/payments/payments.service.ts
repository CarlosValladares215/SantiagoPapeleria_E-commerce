import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentConfig, PaymentConfigDocument } from './schemas/payment-config.schema';

@Injectable()
export class PaymentsService {
    constructor(
        @InjectModel(PaymentConfig.name) private paymentModel: Model<PaymentConfigDocument>
    ) { }

    async getConfig(): Promise<PaymentConfigDocument> {
        let config = await this.paymentModel.findOne().exec();
        if (!config) {
            config = await this.paymentModel.create({
                cashConfig: { maxAmount: 100, restrictedZones: [] },
                bankAccounts: []
            });
        }
        return config;
    }

    async updateConfig(data: Partial<PaymentConfig>): Promise<PaymentConfigDocument> {
        // Upsert setup
        const config = await this.paymentModel.findOne().exec();
        if (!config) {
            return this.paymentModel.create(data);
        }

        // Use findOneAndUpdate to clean update
        const updated = await this.paymentModel.findOneAndUpdate({}, { $set: data }, { new: true }).exec();
        if (!updated) throw new Error("Could not update config");
        return updated;
    }

    async addBankAccount(account: any): Promise<PaymentConfigDocument> {
        const config = await this.getConfig(); // returns Document
        if (!config.bankAccounts) config.bankAccounts = [];
        config.bankAccounts.push(account);
        return config.save();
    }

    async updateBankAccount(accountNumber: string, data: any): Promise<PaymentConfigDocument> {
        const config = await this.getConfig(); // returns Document
        const index = config.bankAccounts.findIndex(acc => acc.accountNumber === accountNumber);
        if (index > -1) {
            // Mongoose array item update might need special handling or just reassignment
            // Simple reassignment of the object in the array:
            const updatedAccount = { ...config.bankAccounts[index], ...data };
            // Mongoose arrays are special. 
            // Better to pull and push or use set?
            // Or just modifying the object properties if it's a subdocument array?
            // Since it is a subdocument array (Schema inside Schema), we can try assigning.
            // However, config.bankAccounts[index] is a subdoc.

            // Let's replace the item in the array to be safe
            config.bankAccounts.splice(index, 1, updatedAccount);
            config.markModified('bankAccounts');
            return config.save();
        }
        return config;
    }

    async removeBankAccount(accountNumber: string): Promise<PaymentConfigDocument> {
        const config = await this.getConfig(); // returns Document
        config.bankAccounts = config.bankAccounts.filter(acc => acc.accountNumber !== accountNumber);
        return config.save();
    }
}
