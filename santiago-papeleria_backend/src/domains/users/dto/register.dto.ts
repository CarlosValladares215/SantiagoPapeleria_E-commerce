
import { IsEmail, IsEnum, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

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
}
