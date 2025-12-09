// src/productos/productos.controller.ts (ACTUALIZADO)

import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
} from '@nestjs/common';
import { ProductosService } from './productos.service';
import { plainToInstance } from 'class-transformer';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductFilterDto } from './dto/product-filter.dto'; // <-- Importar el DTO

// NOTA: La interfaz CategoryCount la manejará Angular, aquí solo devolvemos el objeto de MongoDB
interface CategoryCountResponse {
  name: string;
  count: number;
}

@Controller('productos')
@UseInterceptors(ClassSerializerInterceptor)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

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

  /**
   * Maneja GET /productos/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const producto = await this.productosService.findOne(id);
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
    }
    return plainToInstance(ProductResponseDto, producto, {
      excludeExtraneousValues: false,
    });
  }
}
