import { Controller, Post, Param, Body } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

/**
 * ReviewsController
 * 
 * Endpoints for product reviews.
 * Public access for adding reviews.
 */
@Controller('productos')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    /**
     * POST /productos/:id/reviews
     * Adds a review to a product.
     */
    @Post(':id/reviews')
    async addReview(
        @Param('id') id: string,
        @Body() reviewData: { user_name: string; rating: number; comment: string },
    ) {
        return this.reviewsService.addReview(id, reviewData);
    }
}
