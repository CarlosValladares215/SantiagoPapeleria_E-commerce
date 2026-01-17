import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ErpSyncService } from './erp-sync.service';
import { ErpSyncController } from './erp-sync.controller';
import { ProductERP, ProductERPSchema } from '../../products/schemas/product-erp.schema';
import { Producto, ProductoSchema } from '../../products/schemas/producto.schema';
import { SyncLog, SyncLogSchema } from './schemas/sync-log.schema';
import { ErpConfig, ErpConfigSchema } from './schemas/erp-config.schema';
import { Categoria, CategoriaSchema } from '../../products/schemas/categoria.schema';
import { ProductosModule } from '../../products/productos.module';
import { UsuariosModule } from '../../users/usuarios.module';
import { ClassificationModule } from '../classification';

@Module({
  imports: [
    HttpModule,
    ScheduleModule.forRoot(),
    forwardRef(() => ProductosModule),
    forwardRef(() => UsuariosModule),
    ClassificationModule,
    MongooseModule.forFeature([
      { name: ProductERP.name, schema: ProductERPSchema },
      { name: Producto.name, schema: ProductoSchema },
      { name: SyncLog.name, schema: SyncLogSchema },
      { name: ErpConfig.name, schema: ErpConfigSchema },
      { name: Categoria.name, schema: CategoriaSchema },
    ]),
  ],
  controllers: [ErpSyncController],
  providers: [ErpSyncService],
  exports: [ErpSyncService],
})
export class ErpSyncModule { }
