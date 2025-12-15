import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ErpService } from '../../../../services/erp.service';
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

    // Filters
    searchTerm = signal('');
    statusFilter = signal('all');
    visibilityFilter = signal('all');

    // Computed filtered products
    filteredProducts = computed(() => {
        const list = this.products();
        const search = this.searchTerm().toLowerCase();
        const status = this.statusFilter();
        const visibility = this.visibilityFilter();

        return list.filter(p => {
            const matchesSearch = !search ||
                p.sku.toLowerCase().includes(search) ||
                p.erpName.toLowerCase().includes(search) ||
                p.webName.toLowerCase().includes(search);

            const matchesStatus = status === 'all' || p.enrichmentStatus === status;

            const matchesVisibility = visibility === 'all' ||
                (visibility === 'visible' && p.isVisible) ||
                (visibility === 'hidden' && !p.isVisible);

            return matchesSearch && matchesStatus && matchesVisibility;
        });
    });

    stats = computed(() => {
        const list = this.products();
        return {
            total: list.length,
            visible: list.filter(p => p.isVisible).length,
            pending: list.filter(p => p.enrichmentStatus === 'pending').length,
            draft: list.filter(p => p.enrichmentStatus === 'draft').length,
        };
    });

    constructor(private erpService: ErpService, private router: Router) { }

    ngOnInit() {
        this.loadProducts();
    }

    loadProducts() {
        this.isLoading.set(true);
        // Call the new Search Endpoint which calls getMergedProducts
        // We pass empty search to get all (paginated limit handled in backend default 50, need to increase or implement server pagination UI)
        // For now we assume backend returns a reasonable list or we implement pagination later.
        // The previous React mock had pagination. 
        this.erpService.getAdminProducts({ limit: '1000' }) // Get a large chunk for client processing or implement server pagination
            .pipe(
                finalize(() => this.isLoading.set(false)),
                catchError(err => {
                    console.error('Error loading products', err);
                    return of({ data: [] });
                })
            )
            .subscribe((res: any) => {
                // Backend returns { data: [...], meta: ... }
                if (res && res.data) {
                    this.products.set(res.data);
                }
            });
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
                error: (err) => {
                    console.error('Error updating visibility', err);
                    // Revert on error
                    this.products.update(list => list.map(p =>
                        p.sku === product.sku ? { ...p, isVisible: originalState } : p
                    ));
                }
            });
    }

    editProduct(sku: string) {
        this.router.navigate(['/admin/products/enrich', sku]);
    }
}
