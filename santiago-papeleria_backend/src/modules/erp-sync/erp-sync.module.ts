import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ErpSyncService } from './erp-sync.service';
import { ErpSyncController } from './erp-sync.controller';
import { ProductERP, ProductERPSchema } from '../../schemas/product-erp.schema';
import { Producto, ProductoSchema } from '../../productos/schemas/producto.schema';
import { SyncLog, SyncLogSchema } from './schemas/sync-log.schema';
import { ErpConfig, ErpConfigSchema } from './schemas/erp-config.schema';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: ProductERP.name, schema: ProductERPSchema },
      { name: Producto.name, schema: ProductoSchema },
      { name: SyncLog.name, schema: SyncLogSchema },
      { name: ErpConfig.name, schema: ErpConfigSchema },
    ]),
  ],
  controllers: [ErpSyncController],
  providers: [ErpSyncService],
  exports: [ErpSyncService],
})
export class ErpSyncModule { }
