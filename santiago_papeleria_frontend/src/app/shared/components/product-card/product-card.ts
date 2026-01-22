import { Component, Input, Output, EventEmitter, inject, computed, ChangeDetectionStrategy, signal } from '@angular/core';
import { TimeService } from '../../../services/time/time.service';
import { FavoritesService } from '../../../services/favorites/favorites.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Product } from '../../../models/product.model';
import { DisplayPricePipe } from '../../../pipes/display-price.pipe';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CommonModule, DisplayPricePipe],
    templateUrl: './product-card.html',
    styleUrls: ['./product-card.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCard {
    // Private signal to track product changes reactively
    private _product = signal<Product | undefined>(undefined);

    @Input({ required: true })
    set product(val: Product) {
        this._product.set(val);
    }
    get product(): Product {
        return this._product() as Product;
    }

    @Output() viewDetails = new EventEmitter<string>();
    @Output() addToCart = new EventEmitter<Product>();
    @Output() favoriteToggled = new EventEmitter<boolean>();

    private authService = inject(AuthService);
    private router = inject(Router);

    // Injected Services
    private timeService = inject(TimeService);
    private favoritesService = inject(FavoritesService);

    // Computed: Is this product a favorite?
    // Dependencies: favorites signal AND _product signal
    isFavorite = computed(() => {
        const p = this._product();
        if (!p) return false;
        return this.favoritesService.favorites().has(p._id);
    });

    // Computed: Countdown string
    // Dependencies: now() signal AND _product signal
    countdownDisplay = computed(() => {
        const p = this._product();
        if (!p) return null;

        const endDateIso = p.promocion_activa?.fecha_fin;
        if (!endDateIso) return null;

        const now = this.timeService.now();
        const end = new Date(endDateIso).getTime();
        const diff = end - now;

        if (diff <= 0) return null;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (n: number) => n.toString().padStart(2, '0');

        if (days > 0) {
            return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    });

    toggleFavorite(event: Event): void {
        event.stopPropagation();

        if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/login']);
            return;
        }

        const isNowFavorite = this.favoritesService.toggleFavorite(this.product._id);
        this.favoriteToggled.emit(isNowFavorite); // Still emitting if parent needs to know
    }

    onViewDetails(): void {
        this.viewDetails.emit(this.product.slug || this.product._id);
    }

    onAddToCart(): void {
        if (this.product.stock > 0) {
            let basePrice = this.product.price;
            const isMayorista = this.authService.isMayorista();

            if (isMayorista && this.product.wholesalePrice) {
                basePrice = this.product.wholesalePrice;
            }

            const finalPrice = this.product.promocion_activa
                ? this.product.promocion_activa.precio_descuento
                : basePrice;

            const productToAdd = {
                ...this.product,
                price: finalPrice
            };

            this.addToCart.emit(productToAdd);
        }
    }

    getMainImage(): string {
        if (this.product.images && this.product.images.length > 0) {
            return this.product.images[0];
        }
        return 'assets/images/product-placeholder.png';
    }

    getOriginalPrice(): number {
        if (this.product.promocion_activa) {
            return this.product.promocion_activa.precio_original;
        }
        if (this.product.originalPrice) {
            return this.product.originalPrice;
        }
        if (this.product.discount) {
            return this.product.price / (1 - (this.product.discount || 0) / 100);
        }
        return 0;
    }
}