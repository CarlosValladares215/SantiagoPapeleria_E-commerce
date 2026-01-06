
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsBoolean, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class FiltroPromocionDto {
    @IsOptional()
    @IsString()
    categoria_g1?: string;

    @IsOptional()
    @IsString()
    categoria_g2?: string;

    @IsOptional()
    @IsString()
    categoria_g3?: string;

    @IsOptional()
    @IsString()
    marca?: string;

    @IsOptional()
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
    @IsEnum(['global', 'categoria', 'marca', 'productos'])
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
