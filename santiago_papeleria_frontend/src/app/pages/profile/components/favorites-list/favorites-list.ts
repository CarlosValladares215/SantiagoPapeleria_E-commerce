import { Component, inject, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductService } from '../../../../services/product/product.service';
import { FavoritesService } from '../../../../services/favorites/favorites.service';
import { ProductCard } from '../../../../shared/components/product-card/product-card';
import { Product } from '../../../../models/product.model';

@Component({
    selector: 'app-favorites-list',
    standalone: true,
    imports: [CommonModule, ProductCard],
    templateUrl: './favorites-list.html'
})
export class FavoritesListComponent implements OnInit {
    productService = inject(ProductService);
    favoritesService = inject(FavoritesService);

    activeFilter: string = 'Todos';

    get filters() {
        const allProducts = this.productService.products();
        const categories = new Set(allProducts.map(p => p.category));

        const dynamicFilters = [
            { label: 'Todos', value: 'Todos', count: allProducts.length }
        ];

        categories.forEach(cat => {
            if (cat) {
                const count = allProducts.filter(p => p.category === cat).length;
                dynamicFilters.push({ label: cat, value: cat, count });
            }
        });

        return dynamicFilters;
    }

    constructor() {
        // Reactive load when favorites change
        effect(() => {
            const favIds = Array.from(this.favoritesService.favorites());
            this.loadProducts(favIds);
        }, { allowSignalWrites: true });

        // Reset filter if not applicable
        effect(() => {
            const currentFilters = this.filters.map(f => f.value);
            if (!currentFilters.includes(this.activeFilter)) {
                this.activeFilter = 'Todos';
            }
        });
    }

    ngOnInit() {
        // Initial load (in case effect didn't fire or ran too early)
        const favIds = Array.from(this.favoritesService.favorites());
        this.loadProducts(favIds);
    }

    loadProducts(ids: string[]) {
        if (ids.length > 0) {
            this.productService.fetchProducts({
                searchTerm: '',
                category: '',
                brand: '',
                priceRange: [0, 10000],
                inStock: false,
                sortBy: 'name',
                ids: ids
            });
        } else {
            this.productService.products.set([]);
        }
    }

    setFilter(filter: string) {
        this.activeFilter = filter;
    }

    get products(): Product[] {
        const all = this.productService.products();
        if (this.activeFilter === 'Todos') {
            return all;
        }
        return all.filter(p => p.category === this.activeFilter);
    }
}
