import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../models/product.model';

@Component({
    selector: 'app-product-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './product-card.html',
    styleUrls: ['./product-card.scss']
})
export class ProductCard {
    @Input() product!: Product;

    @Output() viewDetails = new EventEmitter<string>();
    @Output() addToCart = new EventEmitter<{ id: string, name: string }>();

    onViewDetails(): void {
        this.viewDetails.emit(this.product._id);
    }

    onAddToCart(): void {
        if (this.product.stock > 0) {
            this.addToCart.emit({
                id: this.product._id,
                name: this.product.name
            });
        }
    }

    getMainImage(): string {
        if (this.product.images && this.product.images.length > 0) {
            return this.product.images[0];
        }
        return 'assets/images/placeholder.png'; // Fallback image
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
