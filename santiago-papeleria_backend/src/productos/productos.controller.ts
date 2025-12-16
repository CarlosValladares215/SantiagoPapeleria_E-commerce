// src/productos/productos.controller.ts (ACTUALIZADO)

import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
  Put,
  Body,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { plainToInstance } from 'class-transformer';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { EnrichProductDto } from './dto/enrich-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Post, UploadedFile } from '@nestjs/common';
import type { Express } from 'express'; // Types

// NOTA: La interfaz CategoryCount la manejará Angular, aquí solo devolvemos el objeto de MongoDB
interface CategoryCountResponse {
  name: string;
  count: number;
}

@Controller('productos')
@UseInterceptors(ClassSerializerInterceptor)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) { }

  /**
   * Maneja GET /productos?category=...&sortBy=...
   */
  @Get()
  async findAll(
    @Query() filterDto: ProductFilterDto,
  ): Promise<ProductResponseDto[]> {
    const productos = await this.productosService.findAll(filterDto);

    // Transforma los datos filtrados y ordenados al formato DTO para Angular
    // Usamos excludeExtraneousValues: false para asegurar que class-transformer tenga acceso a todo el objeto fuente
    return plainToInstance(ProductResponseDto, productos, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * Maneja GET /productos/counts
   * Expone la estadística para CategoryCount
   */
  @Get('counts')
  async getCategoryCounts(): Promise<CategoryCountResponse[]> {
    // El servicio ya retorna el formato correcto {name, count}
    return this.productosService.getCategoryCounts();
  }

  // --- Endpoints de Enriquecimiento (ADMIN) ---

  @Get('admin/search')
  async searchAdmin(@Query() filterDto: ProductFilterDto): Promise<any> { // Retorna estructura paginada, no array simple
    return this.productosService.getMergedProducts(filterDto);
  }

  /**
   * Maneja GET /productos/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const producto = await this.productosService.findOne(id);
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
    }

    // NEW: Enforce visibility check for public endpoint
    // If product is not public, return 404 (don't reveal it exists but is hidden)
    if (!producto.es_publico) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
    }

    return plainToInstance(ProductResponseDto, producto, {
      excludeExtraneousValues: false,
    });
  }

  @Put(':id/enrich')
  async enrichProduct(
    @Param('id') id: string,
    @Body() updateData: EnrichProductDto, // Typed DTO
  ): Promise<ProductResponseDto> {
    const producto = await this.productosService.enrichProduct(id, updateData);
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
    }
    return plainToInstance(ProductResponseDto, producto, {
      excludeExtraneousValues: false,
    });
  }

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
    // Return the public URL
    // Assuming the app is served at localhost:3000
    // The static assets configuration in main.ts will map /uploads to the ./uploads folder
    const filename = file.filename;
    return {
      url: `${process.env.API_URL || 'http://localhost:3000'}/uploads/${filename}`,
      originalName: file.originalname
    };
  }
}
