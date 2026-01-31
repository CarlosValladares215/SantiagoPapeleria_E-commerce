// src/productos/dto/product-filter.dto.ts

import {
  IsOptional,
  IsString,
  IsNumberString,
  IsBooleanString,
  IsArray,
  ArrayUnique,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ProductFilterDto {
  @IsOptional()
  @IsString()
  searchTerm?: string; // Mapea a 'searchTerm' en FilterState

  @IsOptional()
  @IsString()
  category?: string; // Mapea a 'category'

  @IsOptional()
  @IsString()
  brand?: string; // Mapea a 'brand'

  @IsOptional()
  // Usamos IsNumberString si el parámetro viene como string en la URL
  @IsNumberString()
  minPrice?: string; // Límite inferior de 'priceRange'

  @IsOptional()
  @IsNumberString()
  maxPrice?: string; // Límite superior de 'priceRange'

  @IsOptional()
  @IsBooleanString()
  inStock?: string; // Mapea a 'inStock'

  @IsOptional()
  @IsString()
  status?: string; // 'pending' | 'draft' | 'complete'

  @IsOptional()
  @IsString()
  stockStatus?: string; // 'low' | 'out_of_stock' | 'normal'

  @IsOptional()
  @IsBooleanString()
  isVisible?: string; // 'true' | 'false'

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsString()
  // Validamos que el valor de ordenación sea uno de los permitidos
  @IsIn(['name', '-name', 'price', '-price', 'stock', '-stock', 'bestselling'])
  sortBy?: string; // Mapea a 'sortBy'

  @IsOptional()
  @IsBooleanString()
  isOffer?: string; // Filtro para ofertas (promociones o price tiers)

  @IsOptional()
  @IsString()
  excludeId?: string; // Nuevo campo para excluir un producto específico (por SKU o ID)

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try { return JSON.parse(trimmed); } catch { return [trimmed]; }
      }
      return [trimmed];
    }
    return value;
  })
  ids?: string[]; // Filtrar por lista de IDs/SKUs
}
