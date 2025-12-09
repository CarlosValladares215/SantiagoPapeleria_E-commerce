// src/productos/schemas/producto.schema.ts (CORREGIDO)

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Define la interfaz para el documento
export type ProductoDocument = Producto & Document;

// 1. Clasificación
@Schema() // <--- ¡CORRECCIÓN CLAVE!
class Clasificacion {
  @Prop({ required: true })
  linea: string;

  @Prop({ required: true })
  grupo: string;

  @Prop({ required: true })
  marca: string;
}

// 2. Precios
@Schema() // <--- ¡CORRECCIÓN CLAVE!
class Precios {
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
@Schema() // <--- ¡CORRECCIÓN CLAVE!
class Bodega {
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
@Schema() // <--- ¡CORRECCIÓN CLAVE!
class Stock {
  @Prop({ required: true })
  total_disponible: number;

  @Prop({ required: true })
  controlar_stock: boolean;

  @Prop({ type: [Bodega] })
  bodegas: Bodega[];
}

// 5. Multimedia
@Schema() // <--- ¡CORRECCIÓN CLAVE!
class Multimedia {
  @Prop()
  principal: string;

  @Prop({ type: [String] })
  galeria: string[];
}

// 6. Auditoria
@Schema()
class Auditoria {
  @Prop()
  fecha_creacion: Date;

  @Prop()
  ultima_sincronizacion_dobranet: Date;
}

// 7. Precios por Volumen (Tiered Pricing)
@Schema()
class PriceTier {
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
}

export const ProductoSchema = SchemaFactory.createForClass(Producto);
