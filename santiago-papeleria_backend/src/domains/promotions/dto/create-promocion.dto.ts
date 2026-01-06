
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, IsBoolean, IsDateString, ValidateNested, Min, Max, IsArray } from 'class-validator';
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

export class CreatePromocionDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsOptional()
    descripcion?: string;

    @IsEnum(['porcentaje', 'valor_fijo'])
    tipo: string;

    @IsNumber()
    @Min(0.01)
    valor: number;

    @IsEnum(['global', 'categoria', 'marca', 'productos', 'mixto'])
    ambito: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => FiltroPromocionDto)
    filtro?: FiltroPromocionDto;

    @IsDateString()
    fecha_inicio: Date;

    @IsDateString()
    fecha_fin: Date;

    @IsOptional()
    @IsBoolean()
    activa?: boolean;
}

