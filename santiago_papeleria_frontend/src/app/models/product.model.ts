export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductReview {
  user_name: string;
  rating: number;
  comment: string;
  date: Date;
}

export interface ProductColor {
  name: string;
  label: string;
  hex: string;
}

export interface ProductSize {
  name: string;
  label: string;
  priceMultiplier: number;
}

export interface PriceTier {
  min: number;
  max: number;
  discount: number;
  label: string;
  badge?: string;
}

export interface Product {
  _id: string;         // ID de Mongo
  internal_id: string; // codigo_interno de DobraNet

  // INFO
  name: string;
  brand: string;
  category: string;
  sku?: string;        // Stock Keeping Unit

  // PRECIOS
  price: number;          // precio final (PVP o PVM) - for backward compatibility
  basePrice?: number;     // precio base para cálculos de descuento por cantidad
  wholesalePrice?: number; // precio mayorista
  originalPrice?: number; // precio antes del descuento
  discount?: number;      // porcentaje
  isOffer: boolean;       // true si tiene oferta
  vat_included: boolean;

  // WHOLESALE PRICING
  priceTiers?: PriceTier[]; // descuentos por cantidad

  // PRODUCT VARIANTS
  colors?: ProductColor[];  // variantes de color
  sizes?: ProductSize[];    // variantes de tamaño

  // STOCK
  stock: number;
  isLowStock?: boolean;   // indicador de stock bajo

  // MEDIA
  images: string[];       // principal + galeria

  // DESCRIPCIÓN
  description?: string;
  features?: string[];    // lista de características

  // STICKERS
  isNew: boolean;

  // METADATA
  tags?: string[];        // etiquetas para búsqueda/filtrado
  rating?: number;        // calificación promedio

  // SPECS / REVIEWS
  specs: ProductSpec[];
  reviews: ProductReview[];
}
