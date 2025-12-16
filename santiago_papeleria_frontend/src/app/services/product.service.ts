import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { Product, BranchStock, VariantGroup, Variant } from '../models/product.model';
import { FilterState, CategoryCount } from '../models/filter.model';

// Interface matching Backend Raw Response (Schema)
interface ProductResponse {
  _id: string;
  codigo_interno: string;
  nombre: string;
  clasificacion: { linea: string; grupo: string; marca: string };
  precios: { pvp: number; pvm: number; incluye_iva: boolean };
  priceTiers?: any[];
  stock: { total_disponible: number; bodegas: any[] };
  multimedia: { principal: string; galeria: string[] };
  descripcion_extendida?: string;
  features?: string[];
  grupos_variantes?: any[];
  variantes?: any[];
  peso_kg?: number;
  dimensiones?: any;
  permite_mensaje_personalizado?: boolean;
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
  fetchProductById(id: string): void {
    this.error.set(null);
    this.selectedProduct.set(null); // Clear previous product while loading
    console.log('ProductService: Fetching product by ID:', id);

    this.http.get<ProductResponse>(`${this.apiURL}/${id}`).pipe(
      map(r => this.mapProduct(r))
    ).subscribe({
      next: (product) => {
        console.log('ProductService: Product fetched & mapped:', product);
        this.selectedProduct.set(product);
      },
      error: (error) => {
        console.error('ProductService: Error fetching product:', error);
        this.selectedProduct.set(null);
        this.error.set('No se pudo cargar el producto. Verifique su conexión o intente más tarde.');
      }
    });
  }

  // Related Products
  fetchRelatedProducts(category: string, currentId: string): Observable<Product[]> {
    // Ideally backend endpoint, but using filter on all products for now if not available, 
    // or passing params to fetchProducts. 
    // Implementing a specific call if backend supports it, otherwise filtering `fetchProducts` logic.
    // Assuming a simple filter query for now:
    const params = new HttpParams()
      .set('category', category)
      .set('limit', '4');

    return this.http.get<ProductResponse[]>(this.apiURL, { params }).pipe(
      map(responses =>
        responses
          .filter(r => r._id !== currentId)
          .map(r => this.mapProduct(r))
          .slice(0, 4)
      )
    );
  }

  // Obtener conteo de categorías
  fetchCategoryCounts(): Observable<CategoryCount[]> {
    return this.http.get<CategoryCount[]>(`${this.apiURL}/counts`);
  }

  // MAPPER: Backend (Spanish/Schema) -> Frontend (English/Interface)
  private mapProduct(raw: any): Product {
    // Safety checks for missing fields
    const stockData = raw.stock || { total_disponible: 0, bodegas: [] };
    const priceData = raw.precios || { pvp: 0, pvm: 0, incluye_iva: false };
    const mediaData = raw.multimedia || { principal: '', galeria: [] };
    const classData = raw.clasificacion || { linea: '', grupo: '', marca: '' };

    return {
      _id: raw._id,
      internal_id: raw.codigo_interno,
      name: raw.nombre,
      brand: classData.marca,
      category: classData.linea || classData.grupo, // Fallback
      sku: raw.sku_barras || raw.codigo_interno,

      price: priceData.pvp,
      basePrice: priceData.pvp,
      wholesalePrice: priceData.pvm,
      vat_included: priceData.incluye_iva,
      isOffer: false, // Calculated field, default false

      priceTiers: raw.priceTiers || [],

      stock: stockData.total_disponible,
      branches: (stockData.bodegas || []).map((b: any) => ({
        id_externo: b.id_externo,
        nombre: b.nombre,
        cantidad: b.cantidad,
        ubicacion: b.ubicacion
      })),

      images: [mediaData.principal, ...(mediaData.galeria || [])].filter(Boolean),

      description: raw.descripcion_extendida,
      features: raw.features || [],

      isNew: false, // Metadata not always present
      tags: raw.palabras_clave || [],
      rating: 0, // Not in schema yet?
      specs: [], // Derived or separate
      reviews: [], // Derived or separate

      // New Strict Fields
      has_variants: raw.tiene_variantes || false,
      variant_groups: raw.grupos_variantes || [],
      variants: raw.variantes || [],

      weight_kg: raw.peso_kg,
      dimensions: raw.dimensiones,
      allow_custom_message: raw.permite_mensaje_personalizado
    };
  }
}
