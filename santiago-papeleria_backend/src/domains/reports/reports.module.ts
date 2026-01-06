import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Pedido, PedidoSchema } from '../orders/schemas/pedido.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Pedido.name, schema: PedidoSchema }]),
    ],
    controllers: [ReportsController],
    providers: [ReportsService],
})
export class ReportsModule { }
