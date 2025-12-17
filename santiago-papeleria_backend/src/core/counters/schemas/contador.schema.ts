// src/contadores/schemas/contador.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContadorDocument = Contadores & Document;

// --- Esquema Principal ---
@Schema()
export class Contadores {
  // El _id es el nombre del contador, ej: "pedido_web"
  @Prop({ required: true, unique: true })
  _id: string;

  // El valor actual de la secuencia
  @Prop({ required: true, default: 0 })
  secuencia_actual: number;
}

export const ContadorSchema = SchemaFactory.createForClass(Contadores);
