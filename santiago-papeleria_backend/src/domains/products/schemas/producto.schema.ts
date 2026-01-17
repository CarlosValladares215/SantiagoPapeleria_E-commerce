// src/productos/schemas/producto.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Define la interfaz para el documento
export type ProductoDocument = Producto & Document;

// 1. Clasificación
@Schema()
export class Clasificacion {
  @Prop({ required: true })
  linea: string;

  @Prop({ required: true })
  grupo: string;

  @Prop({ required: true })
  marca: string;
}

// 2. Precios
@Schema()
export class Precios {
  @Prop({ required: true })
  pvp: number;

  @Prop({ required: true })
  pvm: number;

  @Prop({ required: true })
  moneda: string;

  @Prop({ required: true })
  incluye_iva: boolean;
}

// 3. Bodegas (parte del Stock)
@Schema()
export class Bodega {
  @Prop({ required: true })
  id_externo: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  cantidad: number;

  @Prop()
  ubicacion: string;
}

// 4. Stock
@Schema()
export class Stock {
  @Prop({ required: true })
  total_disponible: number;

  @Prop({ required: true })
  controlar_stock: boolean;

  @Prop({ type: [Bodega] })
  bodegas: Bodega[];

  @Prop({ enum: ['normal', 'bajo', 'agotado'], default: 'normal' })
  estado_stock: string;

  @Prop({ default: 5 })
  umbral_stock_alerta: number;
}

// 5. Multimedia
@Schema()
export class Multimedia {
  @Prop()
  principal: string;

  @Prop({ type: [String] })
  galeria: string[];
}

// 6. Auditoria
@Schema()
export class AuditoriaItem {
  @Prop({ default: Date.now })
  date: Date;

  @Prop()
  admin: string;

  @Prop()
  action: string;
}

@Schema()
export class Auditoria {
  @Prop()
  fecha_creacion: Date;

  @Prop()
  ultima_sincronizacion_dobranet: Date;

  @Prop({ type: [AuditoriaItem], default: [] })
  historial_cambios: AuditoriaItem[];
}

// 7. Precios por Volumen (Tiered Pricing)
@Schema()
export class PriceTier {
  @Prop({ required: true })
  min: number;

  @Prop({ required: true })
  max: number;

  @Prop({ required: true })
  discount: number;

  @Prop({ required: true })
  label: string;

  @Prop()
  badge: string;
}

// 8. Dimensiones
@Schema()
export class Dimensiones {
  @Prop({ default: 0 })
  largo: number;

  @Prop({ default: 0 })
  ancho: number;

  @Prop({ default: 0 })
  alto: number;
}

// 9. Promocion Activa (Denormalized for Fast Query Access)
@Schema()
export class PromocionActiva {
  @Prop({ type: Types.ObjectId, ref: 'Promocion' })
  promocion_id?: Types.ObjectId;

  @Prop()
  precio_original: number;

  @Prop()
  precio_descuento: number;

  @Prop({ enum: ['porcentaje', 'precio_fijo', 'featured', '2x1', 'regalo'], default: 'porcentaje' })
  tipo_descuento: string;

  @Prop()
  valor_descuento: number;

  @Prop()
  calculado_at: Date;

  // Fecha de inicio de la promoción (para promociones programadas)
  @Prop({ type: Date })
  fecha_inicio: Date;

  // Fecha de fin de la promoción
  @Prop({ type: Date })
  fecha_fin: Date;

  // Flag para desactivar promoción manualmente sin eliminarla
  @Prop({ default: true })
  activa: boolean;
}

// 10. Review Schema
@Schema()
export class ProductReview {
  @Prop({ required: true })
  user_name: string;

  @Prop({ required: true })
  rating: number;

  @Prop({ required: true })
  comment: string;

  @Prop({ default: Date.now })
  date: Date;
}

// Definición principal del Schema
@Schema()
export class Producto {
  @Prop({ required: true, unique: true })
  codigo_interno: string;

  @Prop()
  sku_barras: string;

  @Prop({ required: true })
  nombre: string;

  @Prop()
  slug: string;

  @Prop()
  activo: boolean;

  @Prop({ type: [String] })
  palabras_clave: string[];

  @Prop({ type: Clasificacion })
  clasificacion: Clasificacion;

  @Prop({ type: Precios })
  precios: Precios;

  @Prop({ type: Stock })
  stock: Stock;

  @Prop({ type: Multimedia })
  multimedia: Multimedia;

  @Prop({ type: Auditoria })
  auditoria: Auditoria;

  @Prop({ type: [PriceTier] })
  priceTiers: PriceTier[];

  // --- CAMPOS DE ENRIQUECIMIENTO ---

  @Prop({ type: [{ key: String, value: String }], default: [] })
  attributes: { key: string; value: string }[];

  @Prop({ default: 0 })
  peso_kg: number;

  @Prop({ type: Dimensiones, default: {} })
  dimensiones: Dimensiones;

  @Prop({ default: false })
  permite_mensaje_personalizado: boolean;

  @Prop()
  descripcion_extendida: string;

  @Prop({ type: [{ label: String, value: String }], default: [] })
  specs: Array<{ label: string; value: string }>;

  @Prop({ default: false })
  enriquecido: boolean;

  @Prop({ enum: ['pending', 'draft', 'complete'], default: 'pending' })
  enrichment_status: string;

  @Prop({ default: false })
  es_publico: boolean;

  @Prop()
  nombre_web: string;

  @Prop({ type: PromocionActiva })
  promocion_activa: PromocionActiva;

  @Prop({ type: [ProductReview], default: [] })
  reviews: ProductReview[];

  // --- CATEGORY REFERENCES (Resolved during sync) ---
  @Prop({ type: Types.ObjectId, ref: 'Categoria' })
  categoria_linea_id: Types.ObjectId;  // Reference to nivel 1 category (linea)

  @Prop({ type: Types.ObjectId, ref: 'Categoria' })
  categoria_grupo_id: Types.ObjectId;  // Reference to nivel 2 category (grupo)

  @Prop({ type: Types.ObjectId, ref: 'Categoria' })
  categoria_sub_id: Types.ObjectId;    // Reference to nivel 3 category (optional)
}

export const ProductoSchema = SchemaFactory.createForClass(Producto);
