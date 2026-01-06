import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromocionDocument = Promocion & Document;

@Schema()
export class FiltroPromocion {
  // Multi-select: Array of categories (each entry is "G1 > G2 > G3" or partial)
  @Prop({ type: [String], default: [] })
  categorias?: string[];

  // Multi-select: Array of brands
  @Prop({ type: [String], default: [] })
  marcas?: string[];

  // Multi-select: Array of product SKUs
  @Prop({ type: [String], default: [] })
  codigos_productos?: string[];
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, collection: 'promociones' })
export class Promocion {
  @Prop({ required: true, unique: true })
  nombre: string;

  @Prop()
  descripcion: string;

  @Prop({ required: true, enum: ['porcentaje', 'valor_fijo'] })
  tipo: string;

  @Prop({ required: true })
  valor: number;

  @Prop({ required: true, enum: ['global', 'categoria', 'marca', 'productos', 'mixto'] })
  ambito: string;

  @Prop({ type: FiltroPromocion })
  filtro: FiltroPromocion;

  @Prop({ required: true })
  fecha_inicio: Date;

  @Prop({ required: true })
  fecha_fin: Date;

  @Prop({ required: true, default: true })
  activa: boolean;

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: Types.ObjectId })
  created_by: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  updated_by: Types.ObjectId;
}

export const PromocionSchema = SchemaFactory.createForClass(Promocion);
