import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { SharedProductsModule } from '../shared';

/**
 * ReviewsModule
 * 
 * Provides product review functionality.
 */
@Module({
    imports: [SharedProductsModule],
    controllers: [ReviewsController],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule { }
