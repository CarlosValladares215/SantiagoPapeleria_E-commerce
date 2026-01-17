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
    @IsNumber({}, { message: 'Largo must be a number.' })
    @Min(0, { message: 'Largo must be non-negative.' })
    @Max(999.9, { message: 'Largo must not exceed 999.9 cm.' })
    largo: number;

    @IsOptional()
    @IsNumber({}, { message: 'Ancho must be a number.' })
    @Min(0, { message: 'Ancho must be non-negative.' })
    @Max(999.9, { message: 'Ancho must not exceed 999.9 cm.' })
    ancho: number;

    @IsOptional()
    @IsNumber({}, { message: 'Alto must be a number.' })
    @Min(0, { message: 'Alto must be non-negative.' })
    @Max(999.9, { message: 'Alto must not exceed 999.9 cm.' })
    alto: number;
}

// Variant classes removed as part of attribute refactoring

export class EnrichProductDto {
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Weight must have a maximum of 3 decimal places.' })
    @Min(0.001, { message: 'Weight is mandatory and must be greater than 0.001 kg (1g).' })
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
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttributeDto)
    attributes?: AttributeDto[];

    @IsOptional()
    @IsString()
    descripcion_extendida?: string;

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

export class AttributeDto {
    @IsString()
    @IsNotEmpty()
    key: string;

    @IsString()
    @IsNotEmpty()
    value: string;
}
