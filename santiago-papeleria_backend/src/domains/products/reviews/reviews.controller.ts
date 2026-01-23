import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { CreateReviewDto } from './dto/create-review.dto';

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
     * Adds a review to a product. Requires purchase.
     */
    @Post(':id/reviews')
    @UseGuards(JwtAuthGuard)
    async addReview(
        @Param('id') id: string,
        @Body() reviewData: CreateReviewDto,
        @Req() req: any
    ) {
        const userId = req.user.sub || req.user._id;
        return this.reviewsService.addReview(id, userId, reviewData);
    }

    /**
     * GET /productos/:id/review-eligibility
     * Checks if the logged in user can review this product.
     */
    @Get(':id/review-eligibility')
    @UseGuards(JwtAuthGuard)
    async checkEligibility(
        @Param('id') id: string,
        @Req() req: any
    ) {
        const userId = req.user.sub || req.user._id;
        const canReview = await this.reviewsService.canUserReviewProduct(userId, id);
        return { canReview };
    }
}
