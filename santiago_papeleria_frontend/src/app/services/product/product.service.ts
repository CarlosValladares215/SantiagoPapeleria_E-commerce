import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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
  promocion_activa?: any;

  // Additional fields that might come from backend
  description?: string;
  features?: string[];
  has_variants?: boolean;
  variant_groups?: any[];
  variants?: any[];
}

// Pagination Interface
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  products = signal<Product[]>([]);
  paginationMeta = signal<PaginationMeta>({ total: 0, page: 1, limit: 12, totalPages: 0 });
  selectedProduct = signal<Product | null>(null);
  error = signal<string | null>(null);

  private apiURL = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Traer todos los productos con filtros
  // Traer todos los productos con filtros (Paginado)
  fetchProducts(filters: FilterState): void {
    this.error.set(null);
    let params = new HttpParams();

    // Standard Filters
    if (filters.searchTerm) params = params.set('searchTerm', filters.searchTerm);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.brand) params = params.set('brand', filters.brand);
    if (filters.priceRange) {
      params = params.set('minPrice', filters.priceRange[0].toString());
      params = params.set('maxPrice', filters.priceRange[1].toString());
    }
    if (filters.inStock) params = params.set('inStock', filters.inStock.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);

    // Server-Side Pagination & Offer Filter
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.isOffer) params = params.set('isOffer', 'true');

    if (filters.ids && filters.ids.length > 0) {
      filters.ids.forEach(id => {
        params = params.append('ids', id);
      });
    }

    // Expecting Paginated Response now
    this.http.get<PaginatedResponse<ProductResponse>>(this.apiURL, { params }).pipe(
      map(response => ({
        data: response.data.map(r => this.mapProduct(r)),
        meta: response.meta
      }))
    ).subscribe({
      next: (res) => {
        this.products.set(res.data);
        this.paginationMeta.set(res.meta);
        console.log('ProductService: Fetched products', res.meta);
      },
      error: (error) => {
        console.error('Error fetching products:', error);
        this.error.set('Error al cargar los productos. Por favor intente nuevamente.');
        this.products.set([]); // Clear on error
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

    // Backend returns PaginatedResponse
    return this.http.get<PaginatedResponse<ProductResponse>>(this.apiURL, { params }).pipe(
      map(response => response.data.map(r => this.mapProduct(r)))
    );
  }

  // Obtener conteo de categorías
  fetchCategoryCounts(isOffer?: boolean): Observable<CategoryCount[]> {
    let params = new HttpParams();
    if (isOffer) params = params.set('isOffer', 'true');
    return this.http.get<CategoryCount[]>(`${this.apiURL}/counts`, { params });
  }

  // Cache Keys & State
  private readonly CATEGORY_CACHE_KEY = 'category_structure_cache';
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private memoryCache: any[] | null = null;

  // Obtener estructura de categorías (Lineas -> Grupos)
  // Implements caching: Memory -> LocalStorage -> API
  fetchCategoriesStructure(): Observable<any[]> {
    // 1. Memory Cache
    const memCache = this.memoryCache;
    if (memCache) {
      return of(memCache);
    }

    // 2. Storage Cache
    const cached = localStorage.getItem(this.CATEGORY_CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < this.CACHE_TTL_MS) {
          this.memoryCache = data; // Hydrate memory
          return of(data);
        } else {
          localStorage.removeItem(this.CATEGORY_CACHE_KEY); // Expired
        }
      } catch (e) {
        localStorage.removeItem(this.CATEGORY_CACHE_KEY); // Invalid
      }
    }

    // 3. Network Request
    return this.http.get<any[]>(`${this.apiURL}/structure`).pipe(
      map(data => {
        // Save to cache
        this.memoryCache = data;
        localStorage.setItem(this.CATEGORY_CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        return data;
      })
    );
  }

  // Obtener lista de marcas
  fetchBrands(isOffer?: boolean): Observable<string[]> {
    let params = new HttpParams();
    if (isOffer) params = params.set('isOffer', 'true');
    return this.http.get<string[]>(`${this.apiURL}/brands`, { params });
  }

  // --- ADMIN METHODS ---
  searchAdminProducts(term: string, page: number = 1, limit: number = 20): Observable<any> {
    let params = new HttpParams()
      .set('searchTerm', term)
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<any>(`${this.apiURL}/admin/search`, { params });
  }

  getAdminProductsByIds(ids: string[]): Observable<any> {
    let params = new HttpParams();
    ids.forEach(id => params = params.append('ids', id));
    return this.http.get<any>(`${this.apiURL}/admin/search`, { params });
  }

  addReview(productId: string, review: { user_name: string; rating: number; comment: string }): Observable<Product> {
    return this.http.post<ProductResponse>(`${this.apiURL}/${productId}/reviews`, review).pipe(
      map(r => this.mapProduct(r))
    );
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
      promocion_activa: raw.promocion_activa,

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
      weight: (raw as any).weight_kg || (raw as any).peso_kg || raw.weight || 0,
      weight_kg: (raw as any).weight_kg || (raw as any).peso_kg || raw.weight || 0, // Same field
      dimensions: raw.dimensions,
      allowCustomMessage: raw.allowCustomMessage,
      allows_custom_message: raw.allowCustomMessage, // Alias
      attributes: raw.attributes || []
    };
  }
}