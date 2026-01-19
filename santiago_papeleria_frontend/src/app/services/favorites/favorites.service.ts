import { Injectable, signal, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FavoritesService {
    authService = inject(AuthService);
    http = inject(HttpClient);

    // Signal containing the Set of favorite product IDs
    favorites = signal<Set<string>>(new Set());

    private readonly STORAGE_KEY = 'favorites';
    private apiUrl = `${environment.baseApiUrl}/usuarios/favorites/toggle`;

    constructor() {
        // Sync with Auth User
        effect(() => {
            const user = this.authService.user();
            if (user && user.favorites) {
                // If logged in, use server data but CLEAN IT
                const validIds = user.favorites.filter(id => id !== '[object Object]' && id.length === 24);
                this.favorites.set(new Set(validIds));
            } else {
                // If guest (or just logged out), use local storage
                this.loadFromStorage();
            }
        }, { allowSignalWrites: true });

        // Auto-save effect for GUESTS ONLY: Whenever 'favorites' signal changes, save to localStorage
        effect(() => {
            const user = this.authService.user();
            if (!user) {
                const ids = Array.from(this.favorites());
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
            }
        });
    }

    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const ids = JSON.parse(stored);
                if (Array.isArray(ids)) {
                    // Filter out non-string or garbage strings
                    const validIds = ids.filter(id => typeof id === 'string' && id !== '[object Object]' && id.length === 24);
                    this.favorites.set(new Set(validIds));
                }
            } else {
                this.favorites.set(new Set());
            }
        } catch (e) {
            console.error('Error loading favorites from storage', e);
        }
    }

    toggleFavorite(productId: string): boolean {
        // Strict validation: Must be a string and look like an ID (24 chars) -> Prevents sending binary data/objects
        if (!productId || typeof productId !== 'string' || productId.length !== 24) {
            console.error('Invalid productId passed to toggleFavorite:', productId);
            return false;
        }

        const current = new Set(this.favorites());
        let isAdded = false;

        // Optimistic Update
        if (current.has(productId)) {
            current.delete(productId);
            isAdded = false;
        } else {
            current.add(productId);
            isAdded = true;
        }
        this.favorites.set(current);

        // If logged in, sync with server
        if (this.authService.isAuthenticated()) {
            this.http.post(this.apiUrl, { productId }).subscribe({
                next: () => console.log('Favorites synced'),
                error: (err) => {
                    console.error('Error syncing favorite', err);
                    // Revert if needed
                }
            });
        }

        return isAdded;
    }

    isFavorite(productId: string): boolean {
        return this.favorites().has(productId);
    }
}
