import { Component, computed, signal, OnInit, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Product } from '../../models/product.model';
import { FilterState, CategoryCount } from '../../models/filter.model';
import { ProductService } from '../../services/product/product.service';
import { CartService } from '../../services/cart/cart.service';

// Components
import { ProductsFilterSidebar } from '../products/components/products-filter-sidebar/products-filter-sidebar';
import { ProductsHeader } from '../products/components/products-header/products-header';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { ProductsPagination } from '../products/components/products-pagination/products-pagination';
import { ToastContainerComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProductsFilterSidebar,
    ProductsHeader,
    ProductCard,
    ProductsPagination,
    ToastContainerComponent
  ],
  templateUrl: './offers.html',
  styleUrls: ['./offers.scss']
})
export class Offers implements OnInit {

  // Data
  categories = signal<CategoryCount[]>([]);

  // Filters
  filters = signal<FilterState>({
    category: '',
    brand: '',
    priceRange: [0, 100],
    inStock: false,
    sortBy: 'name',
    searchTerm: '',
    isOffer: true,
    page: 1,
    limit: 12
  });

  // UI State
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(12);
  showFilters = signal<boolean>(false);

  // Toast
  @ViewChild(ToastContainerComponent) toast!: ToastContainerComponent;

  // Computed values

  // Filtered by Offers
  // Computed values
  totalPages = computed(() =>
    this.productService.paginationMeta().totalPages
  );

  currentProducts = computed(() => {
    return this.productService.products();
  });

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public productService: ProductService,
    private cartService: CartService
  ) {
    // Handle query params for search
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.filters.update(f => ({ ...f, searchTerm: params['search'] }));
      }
    });

    // Trigger fetch when filters change
    effect(() => {
      const currentFilters = this.filters();
      console.log('Offers: Filters changed, fetching products:', currentFilters);
      this.productService.fetchProducts(currentFilters);
      this.currentPage.set(1); // Reset to page 1 on filter change
    });
  }

  ngOnInit(): void {
    this.loadCategoryCounts();
    // Force initial fetch
    // this.productService.fetchProducts(this.filters());
  }

  loadCategoryCounts(): void {
    this.productService.fetchCategoryCounts(true).subscribe({
      next: (data) => {
        this.categories.set(data);
      },
      error: (error) => {
        console.error('Error fetching category counts:', error);
      }
    });
  }

  // Event Handlers
  handleFilterChange(key: keyof FilterState, value: any): void {
    this.filters.update(f => ({ ...f, [key]: value }));
  }

  clearFilters(): void {
    this.filters.set({
      category: '',
      brand: '',
      priceRange: [0, 100],
      inStock: false,
      sortBy: 'name',
      searchTerm: '',
      isOffer: true
    });
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.filters.update(f => ({ ...f, page: page }));
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleAddToCart(product: Product): void {
    if (!product || product.stock <= 0) {
      this.showToast('Producto agotado', 'error');
      return;
    }

    this.cartService.addToCart(product, 1);
    this.showToast(`${product.name} agregado al carrito`, 'success');
  }

  navigateToProduct(id: string): void {
    this.router.navigate(['/product', id]);
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    if (this.toast) {
      this.toast.add(message, type);
    }
  }

  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }
}
