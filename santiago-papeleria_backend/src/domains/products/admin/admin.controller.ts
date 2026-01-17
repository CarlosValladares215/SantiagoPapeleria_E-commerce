import {
    Controller,
    Get,
    Put,
    Param,
    Body,
    Query,
    NotFoundException,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EnrichmentService } from './enrichment.service';
import { ProductFilterDto } from '../catalog/dto/product-filter.dto';
import { EnrichProductDto } from './dto/enrich-product.dto';

/**
 * AdminController
 * 
 * Admin-facing endpoints for product management.
 * TODO: Add @UseGuards(AdminGuard) for production security
 */
@Controller('productos/admin')
export class AdminController {
    constructor(private readonly enrichmentService: EnrichmentService) { }

    /**
     * GET /productos/admin/search
     * Lists products with enrichment status for admin panel.
     */
    @Get('search')
    async searchProducts(@Query() filterDto: ProductFilterDto) {
        return this.enrichmentService.getAdminProductList(filterDto);
    }

    /**
     * PUT /productos/admin/:id/enrich
     * Updates product enrichment data.
     */
    @Put(':id/enrich')
    async enrichProduct(
        @Param('id') id: string,
        @Body() updateData: EnrichProductDto,
    ) {
        const product = await this.enrichmentService.updateProductEnrichment(id, updateData);
        if (!product) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
        }
        return product;
    }

    /**
     * POST /productos/admin/upload
     * Uploads product image.
     */
    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                if (!file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
                    return cb(new Error('Only image files are allowed!'), false);
                }
                cb(null, true);
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
    )
    uploadProductImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new NotFoundException('No file uploaded');
        }
        return {
            url: `${process.env.API_URL || 'http://localhost:3000'}/uploads/${file.filename}`,
            originalName: file.originalname,
        };
    }
}
