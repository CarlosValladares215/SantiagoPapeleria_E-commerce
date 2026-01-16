import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { ProductService } from '../../services/product/product.service';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { ProfileSidebarComponent } from '../../components/profile-sidebar/profile-sidebar';
import { Product } from '../../models/product.model';

@Component({
    selector: 'app-favorites',
    standalone: true,
    imports: [CommonModule, RouterLink, ProductCard, ProfileSidebarComponent],
    templateUrl: './favorites.html',
    styleUrl: './favorites.scss'
})
export class Favorites implements OnInit {
    authService = inject(AuthService);
    productService = inject(ProductService);

    // Filter state
    activeFilter: string = 'Todos';

    // Computed filters based on loaded products
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
        effect(() => {
            const currentFilters = this.filters.map(f => f.value);
            if (!currentFilters.includes(this.activeFilter)) {
                this.activeFilter = 'Todos';
            }
        });
    }

    ngOnInit() {
        this.loadFavorites();
    }

    loadFavorites() {
        const favoritesIds = JSON.parse(localStorage.getItem('favorites') || '[]');

        if (favoritesIds.length > 0) {
            this.productService.fetchProducts({
                searchTerm: '',
                category: '',
                brand: '',
                priceRange: [0, 10000], // Wide range
                inStock: false,
                sortBy: 'name',
                ids: favoritesIds
            });
        } else {
            // Clear current products if no favorites
            this.productService.products.set([]);
        }
    }

    setFilter(filter: string) {
        this.activeFilter = filter;
    }

    // Filtered products logic
    get products(): Product[] {
        const all = this.productService.products();
        if (this.activeFilter === 'Todos') {
            return all;
        }
        return all.filter(p => p.category === this.activeFilter);
    }
}
