import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class FavoritesService {
    // Signal containing the Set of favorite product IDs
    // Using Set for O(1) lookup performance
    favorites = signal<Set<string>>(new Set());

    private readonly STORAGE_KEY = 'favorites';

    constructor() {
        this.loadFavorites();

        // Auto-save effect: Whenever 'favorites' signal changes, save to localStorage
        effect(() => {
            const ids = Array.from(this.favorites());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
        });
    }

    private loadFavorites() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const ids = JSON.parse(stored);
                if (Array.isArray(ids)) {
                    this.favorites.set(new Set(ids));
                }
            }
        } catch (e) {
            console.error('Error loading favorites', e);
        }
    }

    toggleFavorite(productId: string): boolean {
        const current = new Set(this.favorites());
        let isAdded = false;

        if (current.has(productId)) {
            current.delete(productId);
            isAdded = false;
        } else {
            current.add(productId);
            isAdded = true;
        }

        this.favorites.set(current);
        return isAdded;
    }

    isFavorite(productId: string): boolean {
        return this.favorites().has(productId);
    }
}
