// src/promociones/schemas/promocion.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromocionDocument = Promociones & Document;

// --- Sub-Documentos ---

// 1. Valor Descuento
class ValorDescuento {
  @Prop({ required: true })
  tipo: string; // 'PORCENTAJE' o 'MONTO'

  @Prop({ required: true })
  monto: number;
}

// 2. Criterios de Aplicación
class CriteriosAplicacion {
  @Prop({ required: true })
  aplica_a: string; // 'PRODUCTO_ESPECIFICO', 'CATEGORIA', 'CARRITO_TOTAL'

  // Usamos Types.ObjectId para referenciar un Producto si aplica a uno específico
  @Prop({ type: Types.ObjectId, ref: 'Producto', default: null })
  producto_id: Types.ObjectId;

  // Opcional: para promociones por código o stock limitado
  @Prop({ default: null })
  codigo_promocional: string;

  @Prop({ default: null })
  stock_promocional: number;

  @Prop({ default: 1 })
  max_usos_por_usuario: number;
}

// 3. Fechas de Vigencia
class FechasVigencia {
  @Prop({ required: true })
  fecha_inicio: Date;

  @Prop({ required: true })
  fecha_fin: Date;
}

// --- Esquema Principal ---

@Schema()
export class Promociones {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true, unique: true })
  codigo: string; // Código de uso interno o código canjeable

  @Prop()
  descripcion: string;

  @Prop({ required: true })
  tipo_promocion: string; // 'DESCUENTO_ITEM', 'ENVIO_GRATIS', 'COMBO'

  @Prop({ type: ValorDescuento, required: true })
  valor_descuento: ValorDescuento;

  @Prop({ type: CriteriosAplicacion, required: true })
  criterios_aplicacion: CriteriosAplicacion;

  @Prop({ type: FechasVigencia, required: true })
  fechas_vigencia: FechasVigencia;

  @Prop({ required: true, default: 'INACTIVA' })
  estado: string; // 'ACTIVA', 'INACTIVA', 'EXPIRADA'

  @Prop({ default: 1 })
  prioridad: number; // Para resolver conflictos si aplica más de una promoción
}

export const PromocionSchema = SchemaFactory.createForClass(Promociones);
