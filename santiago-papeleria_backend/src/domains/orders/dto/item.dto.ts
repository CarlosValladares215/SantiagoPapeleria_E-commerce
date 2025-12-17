// src/pedidos/dto/item.dto.ts

import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ItemDto {
  @IsString()
  @IsNotEmpty()
  codigo_dobranet: string;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsNumber()
  cantidad: number;

  @IsNumber()
  precio_unitario_aplicado: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  impuesto_iva: number;
}
