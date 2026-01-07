import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsBoolean, IsDateString, ValidateNested, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class FiltroPromocionDto {
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categorias?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    marcas?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    codigos_productos?: string[];
}

export class UpdatePromocionDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    nombre?: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @IsOptional()
    @IsEnum(['porcentaje', 'valor_fijo'])
    tipo?: string;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    valor?: number;

    @IsOptional()
    @IsEnum(['global', 'categoria', 'marca', 'productos', 'mixto'])
    ambito?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => FiltroPromocionDto)
    filtro?: FiltroPromocionDto;

    @IsOptional()
    @IsDateString()
    fecha_inicio?: Date;

    @IsOptional()
    @IsDateString()
    fecha_fin?: Date;

    @IsOptional()
    @IsBoolean()
    activa?: boolean;
}
