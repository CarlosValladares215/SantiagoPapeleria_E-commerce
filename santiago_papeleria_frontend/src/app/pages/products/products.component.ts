import { Component, computed, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Product } from '../../models/product.model';
import { FilterState, CategoryCount } from '../../models/filter.model';
import { ProductService } from '../../services/product.service';

// Components
import { ProductsFilterSidebar } from './components/products-filter-sidebar/products-filter-sidebar';
import { ProductsHeader } from './components/products-header/products-header';
import { ProductCard } from './components/product-card/product-card';
import { ProductsPagination } from './components/products-pagination/products-pagination';
import { NotificationToast } from '../../shared/components/notification-toast/notification-toast';

@Component({
    selector: 'app-products',
    standalone: true,
    imports: [
        CommonModule,
        ProductsFilterSidebar,
        ProductsHeader,
        ProductCard,
        ProductsPagination,
        NotificationToast
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
        priceRange: [0, 100],
        inStock: false,
        sortBy: 'name',
        searchTerm: ''
    });

    // UI State
    currentPage = signal<number>(1);
    itemsPerPage = signal<number>(12);
    showFilters = signal<boolean>(false);
    cart = signal<{ [key: string]: number }>({});
    showNotification = signal<boolean>(false);
    notificationMessage = signal<string>('');

    // Computed values
    totalPages = computed(() =>
        Math.ceil(this.productService.products().length / this.itemsPerPage())
    );

    currentProducts = computed(() => {
        const start = (this.currentPage() - 1) * this.itemsPerPage();
        return this.productService.products().slice(start, start + this.itemsPerPage());
    });

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        public productService: ProductService
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
            console.log('Filters changed, fetching products:', currentFilters);
            this.productService.fetchProducts(currentFilters);
            this.currentPage.set(1); // Reset to page 1 on filter change
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
            priceRange: [0, 100],
            inStock: false,
            sortBy: 'name',
            searchTerm: ''
        });
    }

    onPageChange(page: number): void {
        this.currentPage.set(page);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    handleAddToCart(event: { id: string, name: string }): void {
        this.cart.update(c => ({
            ...c,
            [event.id]: (c[event.id] || 0) + 1
        }));

        this.showSuccessNotification(`${event.name} agregado al carrito`);
    }

    navigateToProduct(id: string): void {
        this.router.navigate(['/product', id]);
    }

    showSuccessNotification(message: string): void {
        this.notificationMessage.set(message);
        this.showNotification.set(true);
        setTimeout(() => {
            this.showNotification.set(false);
        }, 3000);
    }

    toggleFilters(): void {
        this.showFilters.update(v => !v);
    }
}
