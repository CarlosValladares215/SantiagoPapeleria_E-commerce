/**
 * Resolved Product Interface
 * 
 * Represents the merged view of ERP data + Enriched data.
 * This is the canonical product structure used across all subdomain services.
 */
export interface ResolvedProduct {
    sku: string;
    erpName: string;
    webName: string;
    brand: string;
    category: string;
    price: number;
    wholesalePrice: number;
    stock: number;
    isVisible: boolean;
    enrichmentStatus: 'pending' | 'draft' | 'complete';
    description: string;
    images: string[];
    weight_kg: number;
    dimensions: ProductDimensions | null;
    allows_custom_message: boolean;
    attributes: ProductAttribute[];

    // Raw data references (for internal use only)
    _erpData?: any;
    _enrichedData?: any;
}

export interface ProductDimensions {
    largo: number;
    ancho: number;
    alto: number;
}

export interface ProductAttribute {
    key: string;
    value: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
