// src/pedidos/dto/direccion-destino.dto.ts

import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class DireccionDestinoDto {
  @IsString()
  @IsNotEmpty()
  calle: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsOptional() // Optional because legacy orders might not have it, but new ones should. Or make it required if enforced? Let's make optional to be safe.
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  codigo_postal?: string;

  @IsOptional()
  @IsString()
  referencia?: string;
}
