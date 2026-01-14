import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Product } from '../../../../models/product.model';
import { DisplayPricePipe } from '../../../../pipes/display-price.pipe';
import { AuthService } from '../../../../services/auth/auth.service';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CommonModule, DisplayPricePipe],
    templateUrl: './product-card.html',
    styleUrls: ['./product-card.scss']
})
export class ProductCard implements OnInit, OnDestroy {
    @Input() product!: Product;

    @Output() viewDetails = new EventEmitter<string>();
    @Output() addToCart = new EventEmitter<Product>();

    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router);

    isFavorite = false;
    countdownDisplay: string | null = null;
    private countdownInterval: any;

    ngOnInit(): void {
        this.loadFavoriteStatus();
        this.startCountdown();
    }

    ngOnDestroy(): void {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    }

    private loadFavoriteStatus(): void {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        this.isFavorite = favorites.includes(this.product._id);
    }

    toggleFavorite(event: Event): void {
        event.stopPropagation();

        // Check if user is logged in
        if (!this.authService.isAuthenticated()) {
            this.router.navigate(['/login']);
            return;
        }

        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

        if (this.isFavorite) {
            const index = favorites.indexOf(this.product._id);
            if (index > -1) favorites.splice(index, 1);
        } else {
            favorites.push(this.product._id);
        }

        localStorage.setItem('favorites', JSON.stringify(favorites));
        this.isFavorite = !this.isFavorite;
    }

    private startCountdown(): void {
        if (!this.product.promocion_activa?.fecha_fin) return;

        const updateCountdown = () => {
            const endDate = new Date(this.product.promocion_activa!.fecha_fin!);
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                this.countdownDisplay = null;
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                }
                this.cdr.markForCheck();
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (days > 0) {
                this.countdownDisplay = `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                this.countdownDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            this.cdr.markForCheck();
        };

        updateCountdown();
        this.countdownInterval = setInterval(updateCountdown, 1000);
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

