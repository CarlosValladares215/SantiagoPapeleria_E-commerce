import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { EnrichmentService } from './enrichment.service';
import { SharedProductsModule } from '../shared';
import { ErpSyncModule } from '../../erp/sync/erp-sync.module';

/**
 * AdminModule
 * 
 * Provides admin product management functionality.
 * Uses forwardRef for ErpSyncModule to avoid circular dependency.
 */
@Module({
    imports: [
        SharedProductsModule,
        forwardRef(() => ErpSyncModule),
    ],
    controllers: [AdminController],
    providers: [EnrichmentService],
    exports: [EnrichmentService],
})
export class AdminModule { }
