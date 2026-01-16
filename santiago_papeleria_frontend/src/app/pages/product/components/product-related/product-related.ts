import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Product } from '../../../../models/product.model';
import { ProductCard } from '../../../../shared/components/product-card/product-card';
import { CartService } from '../../../../services/cart/cart.service';

@Component({
  selector: 'app-product-related',
  standalone: true,
  imports: [CommonModule, ProductCard],
  templateUrl: './product-related.html',
  styleUrls: ['./product-related.scss'],
})
export class ProductRelated {
  @Input() products: Product[] = [];

  private router = inject(Router);
  private cartService = inject(CartService);

  handleViewDetails(slugOrId: string) {
    this.router.navigate(['/product', slugOrId]);
  }

  handleAddToCart(product: Product) {
    this.cartService.addToCart(product, 1);
    // Optional: Show toast via a service or parent?
    // For now, CartService usually handles basics, but notification might be needed.
    // Assuming CartService or Global Toast handles it, or acceptable silent add for related.
    // Let's verify CartService later if it notifies.
  }
}
