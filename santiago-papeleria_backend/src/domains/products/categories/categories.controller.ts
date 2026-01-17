import { Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';

/**
 * CategoriesController
 * 
 * Endpoints for category and brand data.
 * Public access - used for navigation and filters.
 */
@Controller('productos')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    /**
     * GET /productos/counts
     * Gets product count per category for sidebar filters.
     */
    @Get('counts')
    async getCategoryCounts(@Query('isOffer') isOffer?: string) {
        return this.categoriesService.getCategoryCounts(isOffer === 'true');
    }

    /**
     * GET /productos/structure
     * Gets hierarchical category tree for mega menu.
     */
    @Get('structure')
    async getCategoriesStructure() {
        return this.categoriesService.getCategoriesTree();
    }

    /**
     * GET /productos/brands
     * Gets list of available brands.
     */
    @Get('brands')
    async getBrands(@Query('isOffer') isOffer?: string) {
        return this.categoriesService.getBrands(isOffer === 'true');
    }
}
