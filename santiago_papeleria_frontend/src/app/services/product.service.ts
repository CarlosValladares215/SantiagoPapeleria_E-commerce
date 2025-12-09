import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Product } from '../models/product.model';
import { FilterState, CategoryCount } from '../models/filter.model';

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

    this.http.get<Product[]>(this.apiURL, { params }).subscribe({
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

    this.http.get<Product>(`${this.apiURL}/${id}`).subscribe({
      next: (product) => {
        console.log('ProductService: Product fetched successfully:', product);
        this.selectedProduct.set(product);
      },
      error: (error) => {
        console.error('ProductService: Error fetching product:', error);
        this.selectedProduct.set(null);
        this.error.set('No se pudo cargar el producto. Verifique su conexión o intente más tarde.');
      }
    });
  }

  // Obtener conteo de categorías
  fetchCategoryCounts(): Observable<CategoryCount[]> {
    return this.http.get<CategoryCount[]>(`${this.apiURL}/counts`);
  }
}
