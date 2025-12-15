
import {
    IsString,
    IsNumber,
    IsBoolean,
    IsOptional,
    IsArray,
    ValidateNested,
    Min,
    IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class DimensionsDto {
    @IsNumber()
    @Min(0)
    length: number;

    @IsNumber()
    @Min(0)
    width: number;

    @IsNumber()
    @Min(0)
    height: number;
}

class VariantGroupDto {
    @IsString()
    @IsNotEmpty()
    id: string;

    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsNotEmpty()
    tipo: string;

    @IsArray()
    @IsString({ each: true })
    opciones: string[];
}

class VariantDto {
    @IsString()
    id: string;

    @IsNotEmpty()
    combinacion: Record<string, string>;

    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    precio_especifico: number | null;

    @IsNumber()
    @Min(0)
    stock: number;

    @IsBoolean()
    activo: boolean;

    @IsArray()
    @IsString({ each: true })
    imagenes: string[];
}

export class EnrichProductDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    peso_kg?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => DimensionsDto)
    dimensiones?: DimensionsDto;

    @IsOptional()
    @IsBoolean()
    permite_mensaje_personalizado?: boolean;

    @IsOptional()
    @IsBoolean()
    tiene_variantes?: boolean;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VariantGroupDto)
    grupos_variantes?: VariantGroupDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VariantDto)
    variantes?: VariantDto[];

    @IsOptional()
    @IsString()
    descripcion_extendida?: string;

    // Also allowing variantsSummary for convenience as requested in previous steps
    @IsOptional()
    variantsSummary?: any;
}
