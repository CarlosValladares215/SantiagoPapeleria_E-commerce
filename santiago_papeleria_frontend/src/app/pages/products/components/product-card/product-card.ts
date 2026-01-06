import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class ProductCard {
    @Input() product!: Product;

    @Output() viewDetails = new EventEmitter<string>();
    @Output() addToCart = new EventEmitter<Product>();

    private authService = inject(AuthService);

    onViewDetails(): void {
        this.viewDetails.emit(this.product.slug || this.product._id);
    }

    onAddToCart(): void {
        if (this.product.stock > 0) {
            // Create a copy with the correct price based on role
            const isMayorista = this.authService.isMayorista();
            const effectivePrice = (isMayorista && this.product.wholesalePrice)
                ? this.product.wholesalePrice
                : this.product.price;

            const productToAdd = {
                ...this.product,
                price: effectivePrice
            };

            this.addToCart.emit(productToAdd);
        }
    }

    getMainImage(): string {
        if (this.product.images && this.product.images.length > 0) {
            return this.product.images[0];
        }
        return 'assets/images/product-placeholder.png'; // Fallback image
    }

    getStockStatusClass(): string {
        if (this.product.stock === 0) return 'bg-red-100 text-red-700';
        if (this.product.stock < 10) return 'bg-red-100 text-red-700';
        if (this.product.stock < 20) return 'bg-yellow-100 text-yellow-700';
        return 'bg-green-100 text-green-700';
    }

    getStockStatusText(): string {
        if (this.product.stock === 0) return 'Agotado';
        if (this.product.stock < 20) return `Solo ${this.product.stock} disponibles`;
        return 'En Stock';
    }

    getStockIcon(): string {
        if (this.product.stock === 0) return 'ri-close-circle-fill';
        if (this.product.stock < 20) return 'ri-alert-fill';
        return 'ri-checkbox-circle-fill';
    }
}
