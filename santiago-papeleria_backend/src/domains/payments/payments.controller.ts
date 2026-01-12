import { Controller, Get, Put, Body, Post, Delete, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentConfig } from './schemas/payment-config.schema';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Get('config')
    async getConfig(): Promise<PaymentConfig> {
        return this.paymentsService.getConfig();
    }

    @Put('config')
    async updateConfig(@Body() data: Partial<PaymentConfig>): Promise<PaymentConfig> {
        return this.paymentsService.updateConfig(data);
    }

    @Post('bank-accounts')
    async addBankAccount(@Body() account: any) {
        return this.paymentsService.addBankAccount(account);
    }

    @Put('bank-accounts/:number')
    async updateBankAccount(@Param('number') number: string, @Body() data: any) {
        return this.paymentsService.updateBankAccount(number, data);
    }

    @Delete('bank-accounts/:number')
    async removeBankAccount(@Param('number') number: string) {
        return this.paymentsService.removeBankAccount(number);
    }
}
