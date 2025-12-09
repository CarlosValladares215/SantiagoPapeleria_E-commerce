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
import { Type } from 'class-transformer';

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
  // Validamos que el valor de ordenación sea uno de los permitidos
  @IsIn(['name', '-name', 'price', '-price', 'stock', '-stock'])
  sortBy?: string; // Mapea a 'sortBy'
}
