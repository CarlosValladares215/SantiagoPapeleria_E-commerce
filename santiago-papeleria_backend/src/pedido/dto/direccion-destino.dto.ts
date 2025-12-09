// src/pedidos/dto/direccion-destino.dto.ts

import { IsNotEmpty, IsString } from 'class-validator';

export class DireccionDestinoDto {
  @IsString()
  @IsNotEmpty()
  calle: string;

  @IsString()
  @IsNotEmpty()
  ciudad: string;
}
