// src/pedidos/dto/create-pedido.dto.ts

import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemDto } from './item.dto';
import { DireccionDestinoDto } from './direccion-destino.dto';

// --- Clases Internas (Simples DTOs para evitar archivos extra si son pequeños) ---

class ResumenFinancieroDto {
  @IsNumber()
  subtotal_sin_impuestos: number;

  @IsNumber()
  total_impuestos: number;

  @IsNumber()
  costo_envio: number;

  @IsNumber()
  total_pagado: number;

  @IsString()
  metodo_pago: string;

  @IsOptional()
  @IsString()
  comprobante_pago?: string;
}

class DatosEnvioDto {
  @IsOptional()
  @IsString()
  courier: string;

  // En la creación, la guía podría ser 'PENDIENTE' o no enviarse, pero la incluimos para completitud.
  @IsOptional()
  @IsString()
  guia_tracking: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DireccionDestinoDto)
  direccion_destino: DireccionDestinoDto;
}

// --- DTO Principal ---

export class CreatePedidoDto {
  // NOTA: numero_pedido_web debe ser generado por el backend, no por el frontend,
  // por lo que lo omitimos aquí o lo marcamos como opcional.

  @IsMongoId() // Valida que sea un ObjectId válido para la referencia.
  @IsNotEmpty()
  usuario_id: string;

  // Estado inicial del pedido (ej. 'PENDIENTE_PAGO')
  @IsString()
  @IsNotEmpty()
  estado_pedido: string;

  @IsOptional()
  @IsString()
  estado_pago?: string;

  @IsOptional()
  @IsString()
  estado_devolucion?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDto) // Importante para la validación de cada elemento del array
  items: ItemDto[];

  @ValidateNested()
  @Type(() => ResumenFinancieroDto)
  resumen_financiero: ResumenFinancieroDto;

  @ValidateNested()
  @Type(() => DatosEnvioDto)
  datos_envio: DatosEnvioDto;

  // La fecha de compra será usualmente generada por el backend,
  // pero la incluimos si el frontend la enviara por algún motivo.
  @IsString()
  @IsNotEmpty()
  fecha_compra: string;
}
