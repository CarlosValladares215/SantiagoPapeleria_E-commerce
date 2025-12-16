import {
    IsString,
    IsNumber,
    IsBoolean,
    IsOptional,
    IsArray,
    ValidateNested,
    Min,
    Max,
    IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
// ... (previous imports)

class MultimediaDto {
    @IsOptional()
    @IsString()
    principal: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    galeria: string[];
}


class DimensionsDto {
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Length must have a maximum of 1 decimal place.' })
    @Min(0, { message: 'Length must be non-negative.' })
    @Max(999.9, { message: 'Length must not exceed 999.9 cm.' })
    length: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Width must have a maximum of 1 decimal place.' })
    @Min(0, { message: 'Width must be non-negative.' })
    @Max(999.9, { message: 'Width must not exceed 999.9 cm.' })
    width: number;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 1 }, { message: 'Height must have a maximum of 1 decimal place.' })
    @Min(0, { message: 'Height must be non-negative.' })
    @Max(999.9, { message: 'Height must not exceed 999.9 cm.' })
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
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Weight must have a maximum of 3 decimal places.' })
    @Min(0.001, { message: 'Weight is mandatory and must be greater than 0.001 kg.' })
    @Max(500, { message: 'Weight must not exceed 500 kg (Desk Limit).' })
    peso_kg: number;

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
    @IsOptional()
    variantsSummary?: any;

    @IsOptional()
    @IsString()
    nombre_web?: string;

    @IsOptional()
    @IsBoolean()
    es_publico?: boolean;

    @IsOptional()
    @IsString()
    enrichment_status?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => MultimediaDto)
    multimedia?: MultimediaDto;
}
