import {
    Controller,
    Get,
    Param,
    Query,
    NotFoundException,
    UseInterceptors,
    ClassSerializerInterceptor,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ProductFilterDto } from './dto/product-filter.dto';

/**
 * CatalogController
 * 
 * Public-facing endpoints for product catalog.
 * No authentication required - these are customer-visible.
 */
@Controller('productos')
@UseInterceptors(ClassSerializerInterceptor)
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) { }

    /**
     * GET /productos
     * Lists products with optional filters and pagination.
     */
    @Get()
    async findAll(@Query() filterDto: ProductFilterDto) {
        return this.catalogService.findProducts(filterDto);
    }

    /**
     * GET /productos/:id
     * Gets product details by ID, SKU, or slug.
     * Returns 404 if product not found or not visible.
     */
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const product = await this.catalogService.findByTerm(id);

        if (!product) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
        }

        // Visibility check for public endpoint
        if (!product.es_publico) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
        }

        return product;
    }
}
