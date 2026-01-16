
import { IsEmail, IsEnum, IsString, MinLength, IsOptional, Matches, ValidateNested, IsNotEmpty, IsNumber, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class DatosNegocioDto {
    @IsString()
    @IsOptional()
    nombre_negocio: string;

    @IsString()
    @IsOptional()
    ruc: string;

    @IsString()
    @IsOptional()
    direccion_negocio: string;

    @IsString()
    @IsOptional()
    ciudad: string;

    @IsString()
    @IsOptional()
    telefono_negocio: string;
}

export class LocationDto {
    @IsNumber()
    lat: number;

    @IsNumber()
    lng: number;
}

export class DireccionEntregaRegistroDto {
    @IsString()
    @IsOptional()
    alias?: string;

    @IsString()
    @IsOptional()
    calle_principal?: string;

    @IsString()
    @IsOptional()
    ciudad?: string;

    @IsString()
    @IsOptional()
    provincia?: string;

    @IsString()
    @IsOptional()
    referencia?: string;

    @IsString()
    @IsOptional()
    codigo_postal?: string;

    @ValidateNested()
    @Type(() => LocationDto)
    @IsOptional()
    location?: LocationDto;
}

export class RegisterDto {
    @IsString()
    @MinLength(3)
    name: string;

    @IsEmail()
    @Transform(({ value }) => value.toLowerCase())
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsEnum(['MINORISTA', 'MAYORISTA'])
    client_type: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{10}$/, { message: 'Cédula must be 10 digits' })
    cedula?: string;

    @IsNotEmpty()
    @IsString()
    telefono: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => DatosNegocioDto)
    datos_negocio?: DatosNegocioDto;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DireccionEntregaRegistroDto)
    direcciones_entrega?: DireccionEntregaRegistroDto[];
}
