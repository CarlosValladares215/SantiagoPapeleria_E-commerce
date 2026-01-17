// Products Domain - Main Barrel Export
// Import from subdomain modules for clean, focused dependencies

export * from './productos.module';

// Subdomain exports
export * from './shared';
export * from './catalog';
export * from './categories';
export * from './admin';
export * from './inventory';
export * from './reviews';

// Schema exports (for external consumers)
export * from './schemas/producto.schema';
export * from './schemas/product-erp.schema';
export * from './schemas/movimiento-stock.schema';
export * from './schemas/categoria.schema';
