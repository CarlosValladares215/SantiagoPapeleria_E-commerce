import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Product, BranchStock, VariantGroup, Variant } from '../../models/product.model';
import { FilterState, CategoryCount } from '../../models/filter.model';

// Interface matching Backend TRANSFORMED Response (after DTO)
interface ProductResponse {
  _id: string;
  internal_id: string;
  name: string;
  brand: string;
  category: string;
  sku?: string;
  slug?: string;

  // Prices (already transformed by DTO)
  price: number;
  wholesalePrice?: number;
  vat_included: boolean;

  // Stock (already transformed to number by DTO)
  stock: number;

  // Media (already transformed by DTO)
  images: string[];

  // Metadata
  tags?: string[];
  isOffer: boolean;
  isNew: boolean;
  specs: any[];
  reviews: any[];

  // Enrichment (already transformed by DTO)
  priceTiers?: any[];
  attributes?: any[];
  weight?: number;
  dimensions?: any;
  allowCustomMessage?: boolean;

  // Additional fields that might come from backend
  description?: string;
  features?: string[];
  has_variants?: boolean;
  variant_groups?: any[];
  variants?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  products = signal<Product[]>([]);
  selectedProduct = signal<Product | null>(null);
  error = signal<string | null>(null);

  private apiURL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Traer todos los productos con filtros
  fetchProducts(filters: FilterState): void {
    this.error.set(null);
    let params = new HttpParams();

    if (filters.searchTerm) {
      params = params.set('searchTerm', filters.searchTerm);
    }
    if (filters.category) {
      params = params.set('category', filters.category);
    }
    if (filters.brand) {
      params = params.set('brand', filters.brand);
    }
    if (filters.priceRange) {
      params = params.set('minPrice', filters.priceRange[0].toString());
      params = params.set('maxPrice', filters.priceRange[1].toString());
    }
    if (filters.inStock) {
      params = params.set('inStock', filters.inStock.toString());
    }
    if (filters.sortBy) {
      params = params.set('sortBy', filters.sortBy);
    }

    this.http.get<ProductResponse[]>(this.apiURL, { params }).pipe(
      map(responses => responses.map(r => this.mapProduct(r)))
    ).subscribe({
      next: (data) => {
        this.products.set(data);
      },
      error: (error) => {
        console.error('Error fetching products:', error);
        this.error.set('Error al cargar los productos. Por favor intente nuevamente.');
      }
    });
  }

  // Traer un solo producto
  fetchProductById(id: string, silent: boolean = false): void {
    this.error.set(null);
    if (!silent) {
      this.selectedProduct.set(null);
    }
    console.log('ProductService: Fetching product by ID:', id, silent ? '(Silent)' : '');

    this.http.get<ProductResponse>(`${this.apiURL}/${id}`).pipe(
      map(r => this.mapProduct(r))
    ).subscribe({
      next: (product) => {
        console.log('ProductService: Product fetched & mapped:', product);
        this.selectedProduct.set(product);
      },
      error: (error) => {
        console.error('ProductService: Error fetching product:', error);
        if (!silent) {
          this.selectedProduct.set(null);
          this.error.set('No se pudo cargar el producto. Verifique su conexión o intente más tarde.');
        }
      }
    });
  }

  // Related Products
  fetchRelatedProducts(category: string, currentId: string): Observable<Product[]> {
    const params = new HttpParams()
      .set('category', category)
      .set('excludeId', currentId) // Backend exclusion
      .set('limit', '3');

    return this.http.get<ProductResponse[]>(this.apiURL, { params }).pipe(
      map(responses => responses.map(r => this.mapProduct(r)))
    );
  }

  // Obtener conteo de categorías
  fetchCategoryCounts(): Observable<CategoryCount[]> {
    return this.http.get<CategoryCount[]>(`${this.apiURL}/counts`);
  }

  // ✅ MAPPER CORREGIDO: Backend DTO Response -> Frontend Product Model
  private mapProduct(raw: ProductResponse): Product {
    console.log('🔍 Mapping product:', raw.name, 'Stock:', raw.stock);

    // ✅ El DTO ya transformó todo, solo necesitamos mapear
    return {
      _id: raw._id,
      internal_id: raw.internal_id,
      name: raw.name,
      brand: raw.brand,
      category: raw.category,
      sku: raw.sku,
      slug: raw.slug,

      // Prices (already transformed)
      price: raw.price,
      basePrice: raw.price, // Use price as basePrice
      wholesalePrice: raw.wholesalePrice,
      vat_included: raw.vat_included,
      isOffer: raw.isOffer || false,

      // ✅ FIX: Handle Mixed Stock Types (Number vs Object from DB update)
      stock: (typeof raw.stock === 'object' && raw.stock !== null)
        ? Number((raw.stock as any).total_disponible || 0)
        : Number(raw.stock || 0),
      branches: [], // Branches not included in DTO, would need separate endpoint

      // Price Tiers
      priceTiers: raw.priceTiers || [],

      // Media
      images: raw.images || [],

      // Description
      description: raw.description,
      features: raw.features || [],

      // Badges
      isNew: raw.isNew || false,
      tags: raw.tags || [],
      rating: 0, // Not in schema yet
      specs: raw.specs || [],
      reviews: raw.reviews || [],

      // Variants - Normalize Stock too!
      has_variants: raw.has_variants || false,
      variant_groups: raw.variant_groups || [],
      variants: (raw.variants || []).map((v: any) => ({
        ...v,
        stock: (typeof v.stock === 'object' && v.stock !== null)
          ? Number((v.stock as any).total_disponible || 0)
          : Number(v.stock || 0)
      })),

      // Enrichment
      weight: raw.weight,
      weight_kg: raw.weight, // Same field
      dimensions: raw.dimensions,
      allowCustomMessage: raw.allowCustomMessage,
      allows_custom_message: raw.allowCustomMessage, // Alias
      attributes: raw.attributes || []
    };
  }
}