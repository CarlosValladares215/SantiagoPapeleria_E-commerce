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

export interface BranchStock {
  id_externo: string;
  nombre: string;
  cantidad: number;
  ubicacion?: string;
}

export interface Dimensions {
  largo: number;
  ancho: number;
  alto: number;
  unidad?: string;
}

export interface VariantGroup {
  id: string;
  nombre: string; // e.g., "Color", "Talla"
  tipo: string;   // 'color', 'size', 'material', 'custom'
  opciones: string[];
}

export interface Variant {
  id: string;
  combinacion: Record<string, string>; // { "Color": "Rojo", "Talla": "S" }
  sku: string;
  precio_especifico?: number;
  stock: number;
  activo: boolean;
  imagenes: string[];
}

export interface PriceTier {
  min: number;
  max: number;
  discount: number;
  label: string;
  badge?: string;
}

export interface PromocionActiva {
  promocion_id: string;
  precio_original: number;
  precio_descuento: number;
  tipo_descuento: string;
  valor_descuento: number;
  calculado_at: Date | string;
}

export interface Product {
  _id: string;         // ID de Mongo
  internal_id: string; // codigo_interno de DobraNet

  // INFO
  name: string;
  brand: string;
  category: string;
  sku?: string;        // Stock Keeping Unit
  slug?: string;       // URL amigable
  descripcion_extendida?: string; // Enriched description

  // PRECIOS
  price: number;          // precio final (PVP o PVM) - for backward compatibility
  basePrice?: number;     // precio base para cálculos de descuento por cantidad
  wholesalePrice?: number; // precio mayorista
  originalPrice?: number; // precio antes del descuento
  discount?: number;      // porcentaje
  promocion_activa?: PromocionActiva; // Nueva promoción activa
  isOffer: boolean;       // true si tiene oferta
  vat_included: boolean;

  // WHOLESALE PRICING
  priceTiers?: PriceTier[]; // descuentos por cantidad

  // PRODUCT VARIANTS / ATTRIBUTES
  // attributes field moved to ENRICHMENT section

  // LOGIC VARIANTS
  has_variants?: boolean;
  variant_groups?: VariantGroup[];
  variants?: Variant[];

  // STOCK
  stock: number;
  branches?: BranchStock[]; // Stock availability per branch
  isLowStock?: boolean;   // indicador de stock bajo

  // ENRICHMENT
  // ENRICHMENT
  weight?: number; // JSON: weight (Legacy)
  weight_kg?: number; // JSON: weight_kg (Enriched Enforced)
  dimensions?: Dimensions;
  allowCustomMessage?: boolean; // JSON: allowCustomMessage (Legacy)
  allows_custom_message?: boolean; // JSON: allows_custom_message (Backend Enriched)
  attributes?: { key: string; value: string }[]; // JSON: attributes

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
