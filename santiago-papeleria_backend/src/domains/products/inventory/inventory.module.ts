import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { StockService } from './stock.service';
import { MovimientosService } from './movimientos.service';
import { SharedProductsModule } from '../shared';

/**
 * InventoryModule
 * 
 * Provides inventory/stock management functionality.
 * Contains StockService and MovimientosService.
 */
@Module({
    imports: [SharedProductsModule],
    controllers: [InventoryController],
    providers: [StockService, MovimientosService],
    exports: [StockService, MovimientosService],
})
export class InventoryModule { }
