import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ErpService } from '../../../services/erp/erp.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

interface MergedProduct {
    sku: string;
    erpName: string;
    brand: string;
    price: number;
    stock: number;
    webName: string;
    enrichmentStatus: 'pending' | 'draft' | 'complete';
    isVisible: boolean;
    category?: string;
}

@Component({
    selector: 'app-admin-products-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './admin-products-list.component.html',
})
export class AdminProductsListComponent implements OnInit {
    products = signal<MergedProduct[]>([]);
    isLoading = signal(true);

    // Toast State
    showToast = false;
    toastMessage = '';
    toastType: 'success' | 'error' = 'success';

    // Pagination & Meta
    page = signal(1);
    limit = signal(20); // Smaller page size for better UX
    totalItems = signal(0);
    totalPages = signal(1);

    // Filters
    searchTerm = signal('');
    statusFilter = signal('all');
    visibilityFilter = signal('all');
    inStockOnly = signal(true); // Default: Prioritize stock

    // Computed filtered products - NOW PASS-THROUGH (Server side does the work)
    filteredProducts = computed(() => this.products());

    stats = computed(() => {
        // Stats might be inaccurate if we only have one page.
        // Ideally backend returns global stats.
        // For now, we can show "Displaying X-Y of Z".
        const start = (this.page() - 1) * this.limit() + 1;
        const end = Math.min(this.page() * this.limit(), this.totalItems());
        return {
            start, end, total: this.totalItems()
        };
    });

    constructor(private erpService: ErpService, private router: Router) { }

    ngOnInit() {
        this.loadProducts();
    }

    loadProducts() {
        this.isLoading.set(true);

        const params: any = {
            page: this.page().toString(),
            limit: this.limit().toString(),
            searchTerm: this.searchTerm(),
            status: this.statusFilter(),
        };

        if (this.visibilityFilter() !== 'all') {
            params.isVisible = this.visibilityFilter() === 'visible' ? 'true' : 'false';
        }

        if (this.inStockOnly()) {
            params.inStock = 'true';
        }

        this.erpService.getAdminProducts(params)
            .pipe(
                finalize(() => this.isLoading.set(false)),
                catchError((err: any) => {
                    console.error('Error loading products', err);
                    return of({ data: [], meta: { total: 0, totalPages: 0 } });
                })
            )
            .subscribe((res: any) => {
                if (res && res.data) {
                    this.products.set(res.data);
                    // Update Meta
                    if (res.meta) {
                        this.totalItems.set(res.meta.total);
                        this.totalPages.set(res.meta.totalPages);
                    }
                }
            });
    }

    // New Filter Handlers
    updateSearch(term: string) {
        this.searchTerm.set(term);
        this.page.set(1);
        this.loadProducts();
    }

    updateStatus(status: string) {
        this.statusFilter.set(status);
        this.page.set(1);
        this.loadProducts();
    }

    updateVisibility(vis: string) {
        this.visibilityFilter.set(vis);
        this.page.set(1);
        this.loadProducts();
    }

    toggleStock() {
        this.inStockOnly.update(v => !v);
        this.page.set(1);
        this.loadProducts();
    }

    changePage(newPage: number) {
        if (newPage >= 1 && newPage <= this.totalPages()) {
            this.page.set(newPage);
            this.loadProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'complete': return 'bg-green-100 text-green-800';
            case 'draft': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-red-100 text-red-800';
        }
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'complete': return 'Completo';
            case 'draft': return 'Borrador';
            default: return 'Sin enriquecer';
        }
    }

    toggleVisibility(product: MergedProduct) {
        if (product.enrichmentStatus !== 'complete') return;

        // Optimistic Update
        const originalState = product.isVisible;
        this.products.update(list => list.map(p =>
            p.sku === product.sku ? { ...p, isVisible: !p.isVisible } : p
        ));

        // Call API patch
        this.erpService.patchProduct(product.sku, { es_publico: !product.isVisible })
            .subscribe({
                next: () => {
                    this.showToastNotification('✅ Visibilidad actualizada correctamente', 'success');
                },
                error: (err: any) => {
                    console.error('Error updating visibility', err);
                    // Revert on error
                    this.products.update(list => list.map(p =>
                        p.sku === product.sku ? { ...p, isVisible: originalState } : p
                    ));
                    this.showToastNotification('❌ Error al actualizar visibilidad', 'error');
                }
            });
    }

    showToastNotification(msg: string, type: 'success' | 'error' = 'success') {
        this.toastMessage = msg;
        this.toastType = type;
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
    }

    editProduct(sku: string) {
        this.router.navigate(['/admin/products/enrich', sku]);
    }
}
