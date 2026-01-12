import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentConfig, PaymentConfigSchema } from './schemas/payment-config.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: PaymentConfig.name, schema: PaymentConfigSchema }])
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService]
})
export class PaymentsModule { }
