// src/usuarios/dto/create-usuario.dto.ts

import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// NOTA: Para este DTO básico de registro, solo pediremos los campos esenciales.

export class DatosFiscalesDto {
  @IsString()
  @IsNotEmpty()
  tipo_identificacion: string;

  @IsString()
  @IsNotEmpty()
  identificacion: string;

  @IsString()
  @IsNotEmpty()
  razon_social: string;

  @IsString()
  @IsOptional()
  direccion_matriz?: string;
}

export class DireccionEntregaDto {
  @IsString()
  @IsNotEmpty()
  alias: string;

  @IsString()
  @IsNotEmpty()
  calle_principal: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsOptional()
  referencia?: string;
}

export class PreferenciasDto {
  @IsOptional()
  acepta_boletin?: boolean;
}

export class CreateUsuarioDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string; // Contraseña en texto plano

  @IsString()
  @IsNotEmpty()
  nombres: string;

  @IsString()
  @IsOptional()
  cedula?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsNotEmpty()
  tipo_cliente: string; // 'FINAL' o 'MAYORISTA'

  @ValidateNested()
  @Type(() => DatosFiscalesDto)
  @IsOptional()
  datos_fiscales?: DatosFiscalesDto;

  @ValidateNested({ each: true })
  @Type(() => DireccionEntregaDto)
  @IsOptional()
  direcciones_entrega?: DireccionEntregaDto[];

  @ValidateNested()
  @Type(() => PreferenciasDto)
  @IsOptional()
  preferencias?: PreferenciasDto;
}
