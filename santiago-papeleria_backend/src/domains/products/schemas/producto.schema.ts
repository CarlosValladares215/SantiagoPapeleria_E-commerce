// src/productos/schemas/producto.schema.ts (CORREGIDO)

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
}

// 5. Multimedia
@Schema()
export class Multimedia {
  @Prop()
  principal: string;

  @Prop({ type: [String] })
  galeria: string[];
}

// 6. Auditoria (Historial de Cambios)
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

// 8. Nuevos Schemas para Enriquecimiento
@Schema()
export class Dimensiones {
  @Prop({ default: 0 })
  largo: number;

  @Prop({ default: 0 })
  ancho: number;

  @Prop({ default: 0 })
  alto: number;
}

@Schema()
export class GrupoVariante {
  @Prop({ required: true })
  id: string; // Timestamp o ID único

  @Prop({ required: true })
  nombre: string; // "Color", "Talla"

  @Prop({ enum: ['color', 'size', 'material', 'custom'], default: 'custom' })
  tipo: string;

  @Prop({ type: [String], default: [] })
  opciones: string[];
}

@Schema()
export class Variante {
  @Prop({ required: true })
  id: string;

  @Prop({ type: Object, required: true })
  combinacion: Record<string, string>; // { "Color": "Rojo", "Talla": "S" }

  @Prop({ required: true, unique: true })
  sku: string;

  @Prop()
  precio_especifico: number; // Override del precio base

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: [String], default: [] })
  imagenes: string[];
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

  @Prop({ type: Clasificacion }) // Mongoose ahora sabe que Clasificacion es un sub-esquema
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

  // --- NUEVOS CAMPOS DE ENRIQUECIMIENTO ---

  @Prop({ type: [{ key: String, value: String }], default: [] })
  attributes: { key: string; value: string }[];

  @Prop({ default: 0 })
  peso_kg: number;

  @Prop({ type: Dimensiones, default: {} })
  dimensiones: Dimensiones;

  @Prop({ default: false })
  permite_mensaje_personalizado: boolean;

  @Prop({ default: false })
  tiene_variantes: boolean;

  @Prop({ type: [GrupoVariante], default: [] })
  grupos_variantes: GrupoVariante[];

  @Prop({ type: [Variante], default: [] })
  variantes: Variante[];

  @Prop()
  descripcion_extendida: string;

  @Prop({ default: false })
  enriquecido: boolean;

  @Prop({ enum: ['pending', 'draft', 'complete'], default: 'pending' })
  enrichment_status: string;

  @Prop({ default: false })
  es_publico: boolean;

  @Prop()
  nombre_web: string; // Título H1 optimizado
}

export const ProductoSchema = SchemaFactory.createForClass(Producto);
