import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Pedido, PedidoSchema } from '../orders/schemas/pedido.schema';
import { Producto, ProductoSchema } from '../products/schemas/producto.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsPdfService } from './reports-pdf.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Pedido.name, schema: PedidoSchema },
            { name: Producto.name, schema: ProductoSchema },
        ]),
    ],
    controllers: [ReportsController],
    providers: [ReportsService, ReportsPdfService],
})
export class ReportsModule { }
