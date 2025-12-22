
import { IsEmail, IsEnum, IsString, MinLength, IsOptional, Matches, ValidateNested } from 'class-validator';
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

    @IsOptional()
    @IsString()
    telefono?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => DatosNegocioDto)
    datos_negocio?: DatosNegocioDto;
}
