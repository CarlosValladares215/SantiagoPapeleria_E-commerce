import { Component, computed, signal, OnInit, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Product } from '../../models/product.model';
import { FilterState, CategoryCount } from '../../models/filter.model';
import { ProductService } from '../../services/product/product.service';
import { CartService } from '../../services/cart/cart.service';

// Components
import { ProductsFilterSidebar } from './components/products-filter-sidebar/products-filter-sidebar';
import { ProductsHeader } from './components/products-header/products-header';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { ProductsPagination } from './components/products-pagination/products-pagination';
import { ToastContainerComponent } from '../../shared/components/toast/toast.component';

@Component({
    selector: 'app-products',
    standalone: true,
    imports: [
        CommonModule,
        ProductsFilterSidebar,
        ProductsHeader,
        ProductCard,
        ProductsPagination,
        ToastContainerComponent
    ],
    templateUrl: './products.component.html',
    styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {

    // Data
    categories = signal<CategoryCount[]>([]);

    // Filters
    filters = signal<FilterState>({
        category: '',
        brand: '',
        priceRange: [0, 1000],
        inStock: false,
        sortBy: 'name',
        searchTerm: ''
    });

    // UI State
    currentPage = signal<number>(1);
    itemsPerPage = signal<number>(12);
    showFilters = signal<boolean>(false);

    // Toast
    @ViewChild(ToastContainerComponent) toast!: ToastContainerComponent;

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
        // Handle query params for search and filters
        this.route.queryParams.subscribe(params => {
            console.log('ProductsComponent: Query Params changed', params);

            // 1. Extract params
            const search = params['search'] || '';
            // Map 'categoria' (URL) to 'category' (Filter) - Support both
            const category = params['categoria'] || params['category'] || '';
            const brand = params['brand'] || '';
            const sort = params['sort'] || 'name';
            const inStock = params['inStock'] === 'true';

            // Price Range Parse
            let priceRange: [number, number] = [0, 1000];
            if (params['minPrice'] && params['maxPrice']) {
                priceRange = [Number(params['minPrice']), Number(params['maxPrice'])];
            }

            // 2. Update Filters Signal (This triggers the effect)
            this.filters.set({
                searchTerm: search,
                category: category,
                brand: brand,
                sortBy: sort,
                inStock: inStock,
                priceRange: priceRange,
                page: this.currentPage(),
                limit: this.itemsPerPage()
            });

            // 3. Reset pagination
            this.currentPage.set(1);
        });

        // Trigger fetch when filters change
        effect(() => {
            const currentFilters = this.filters();
            console.log('Filters changed, fetching products:', currentFilters);
            this.productService.fetchProducts(currentFilters);
            // Note: currentPage reset is also handled in the effect in the original code, 
            // but doing it in params subscription ensures it resets on navigation too.
        });
    }

    ngOnInit(): void {
        this.loadCategoryCounts();
        // Force initial fetch if not triggered by effect (though effect should run initially)
        // this.productService.fetchProducts(this.filters());
    }

    loadCategoryCounts(): void {
        this.productService.fetchCategoryCounts().subscribe({
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
            priceRange: [0, 1000],
            inStock: false,
            sortBy: 'name',
            searchTerm: ''
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

        const success = this.cartService.addToCart(product, 1);
        if (success) {
            this.showToast(`${product.name} agregado al carrito`, 'success');
        } else {
            this.showToast('Stock insuficiente', 'error');
        }
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
