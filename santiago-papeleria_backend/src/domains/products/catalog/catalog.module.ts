import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { SharedProductsModule } from '../shared';

/**
 * CatalogModule
 * 
 * Provides public-facing catalog functionality.
 * Imports SharedProductsModule for Mongoose schemas and merger service.
 */
@Module({
    imports: [SharedProductsModule],
    controllers: [CatalogController],
    providers: [CatalogService],
    exports: [CatalogService],
})
export class CatalogModule { }
