// src/usuarios/dto/create-usuario.dto.ts

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

// NOTA: Para este DTO básico de registro, solo pediremos los campos esenciales.

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
  @IsNotEmpty()
  telefono: string;

  @IsString()
  tipo_cliente: string; // 'FINAL' o 'MAYORISTA'
}
