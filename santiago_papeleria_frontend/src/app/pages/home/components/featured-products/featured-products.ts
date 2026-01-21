import { Component, inject, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth/auth.service';
import { ReportesService } from '../../../../services/reportes.service';
import { ProductService } from '../../../../services/product/product.service';
import { Product } from '../../../../models/product.model';
import { ProductCard } from '../../../../shared/components/product-card/product-card';
import { CartService } from '../../../../services/cart/cart.service';

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [RouterModule, CommonModule, ProductCard],
  templateUrl: './featured-products.html',
  styleUrl: './featured-products.scss',
})
export class FeaturedProducts implements OnInit {
  authService = inject(AuthService);
  private reportesService = inject(ReportesService);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private router = inject(Router);

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  products = signal<Product[]>([]);
  loading = signal<boolean>(true);

  ngOnInit() {
    this.fetchBestSellers();
  }

  fetchBestSellers() {
    this.loading.set(true);
    // Try to get real best sellers first
    // Use public catalog endpoint instead of protected reports endpoint
    this.productService.getFeaturedProducts(6).subscribe({
      next: (products) => {
        if (products && products.length > 0) {
          this.products.set(products);
          this.loading.set(false);
        } else {
          this.fetchFallbackProducts();
        }
      },
      error: (err) => {
        console.error('Error fetching featured products', err);
        this.fetchFallbackProducts();
      }
    });
  }

  fetchFallbackProducts() {
    console.log('Fetching fallback products (Latest)...');
    this.productService.getLatestProducts(6).subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching fallback products', err);
        this.products.set([]);
        this.loading.set(false);
      }
    });
  }

  scrollLeft() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollBy({ left: -300, behavior: 'smooth' });
    }
  }

  scrollRight() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollBy({ left: 300, behavior: 'smooth' });
    }
  }

  navigateToProduct(result: string) {
    // result can be slug or id
    this.router.navigate(['/product', result]);
  }

  handleAddToCart(product: Product) {
    this.cartService.addToCart(product, 1);
  }
}
