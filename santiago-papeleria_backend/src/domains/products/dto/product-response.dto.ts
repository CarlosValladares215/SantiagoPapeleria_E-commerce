// src/productos/dto/product-response.dto.ts

import { Expose, Transform, Type } from 'class-transformer';
import { Producto } from '../schemas/producto.schema';

export class ProductResponseDto {
  // --- CAMPOS SIMPLES REQUERIDOS ---
  @Expose()
  @Transform(({ obj }) => (obj._id ? obj._id.toString() : ''))
  _id: string;

  @Expose()
  @Transform(({ obj }) => obj.codigo_interno)
  internal_id: string;

  @Expose()
  @Transform(({ obj }) => obj.nombre)
  name: string;

  @Expose()
  slug: string;

  @Expose()
  activo: boolean;

  // --- INFO ANIDADA ---
  @Expose()
  @Transform(({ obj }) => {
    const clasificacion = obj.clasificacion;
    if (clasificacion && typeof clasificacion === 'object') {
      return clasificacion.marca || '';
    }
    return '';
  })
  brand: string;

  @Expose()
  @Transform(({ obj }) => {
    const clasificacion = obj.clasificacion;
    if (clasificacion && typeof clasificacion === 'object') {
      return clasificacion.grupo || '';
    }
    return '';
  })
  category: string;

  @Expose()
  @Transform(({ obj }) => obj.sku_barras || '')
  sku?: string;

  // --- PRECIOS ANIDADOS ---
  @Expose()
  @Transform(({ obj }) => {
    const precios = obj.precios;
    if (precios && typeof precios === 'object') {
      return precios.pvp ?? 5.99;
    }
    return 5.99;
  })
  price: number;

  @Expose()
  @Transform(({ obj }) => {
    const precios = obj.precios;
    if (precios && typeof precios === 'object') {
      return precios.pvm ?? 5.99;
    }
    return 5.99;
  })
  wholesalePrice?: number;

  @Expose()
  @Transform(({ obj }) => obj.precios?.incluye_iva ?? false)
  vat_included: boolean;

  // --- STOCK ANIDADO ---
  @Expose()
  @Transform(({ obj }) => {
    const stock = obj.stock;
    // Handle case where stock is just a number (e.g. from aggregation or simplified query)
    if (typeof stock === 'number') {
      return stock;
    }
    // Handle case where stock is an object (e.g. { total_disponible: 500, ... })
    if (stock && typeof stock === 'object') {
      return stock.total_disponible ?? 10;
    }
    return 10;
  })
  stock: number;

  // --- MULTIMEDIA ANIDADA ---
  @Expose()
  @Transform(({ obj }) => {
    const principal = obj.multimedia?.principal
      ? [obj.multimedia.principal]
      : [];
    const galeria = obj.multimedia?.galeria || [];
    return [...principal, ...galeria];
  })
  images: string[];

  // --- METADATA ---
  @Expose()
  @Transform(({ obj }) => obj.palabras_clave || [])
  tags?: string[];

  // Campos de estado requeridos por Angular
  @Expose()
  @Transform(({ obj }) => {
    // Si tiene tiers de precio O una promoción activa, es una oferta
    if (obj.priceTiers && obj.priceTiers.length > 0) return true;
    if (obj.promocion_activa) return true;
    return false;
  })
  isOffer: boolean;
  @Expose() isNew: boolean = true;

  @Expose()
  @Transform(({ obj }) => obj.specs || [])
  specs: any[];

  @Expose() reviews: any[] = [];

  // --- NUEVO CAMPO: PRICE TIERS ---
  @Expose()
  @Transform(({ obj }) => obj.priceTiers || [])
  priceTiers: any[];

  // --- PROMOTIONS ---
  @Expose()
  @Type(() => Object)
  promocion_activa?: any;

  // --- ENRICHED FIELDS (FIX) ---
  @Expose()
  @Transform(({ obj }) => obj.attributes || [])
  attributes: any[];

  @Expose()
  @Transform(({ obj }) => obj.weight_kg || 0)
  weight: number;

  @Expose()
  @Transform(({ obj }) => obj.dimensions || {})
  dimensions: any;

  @Expose()
  @Transform(({ obj }) => obj.allows_custom_message || false)
  allowCustomMessage: boolean;
}
