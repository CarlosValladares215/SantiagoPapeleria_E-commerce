import { Component, computed, signal, WritableSignal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ProductService } from '../../services/product.service';
import { Product as ProductModel, PriceTier } from '../../models/product.model';

// COMPONENTES
import { ProductBreadcrumb } from './components/product-breadcrumb/product-breadcrumb';
import { ProductSpecs } from './components/product-specs/product-specs';
import { ProductReviews } from './components/product-reviews/product-reviews';
import { ProductActions } from './components/product-actions/product-actions';
import { ProductRelated } from './components/product-related/product-related';
import { ProductImageGallery } from './components/product-image-gallery/product-image-gallery';
import { ProductVariants } from './components/product-variants/product-variants';
import { PricingTiers } from './components/pricing-tiers/pricing-tiers';
import { PriceSummary } from './components/price-summary/price-summary';
import { TrustBadges } from './components/trust-badges/trust-badges';
import { ShippingInfo } from './components/shipping-info/shipping-info';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [
    CommonModule,
    ProductBreadcrumb,
    ProductSpecs,
    ProductReviews,
    ProductActions,
    ProductRelated,
    ProductImageGallery,
    ProductVariants,
    PricingTiers,
    PriceSummary,
    TrustBadges,
    ShippingInfo
  ],
  templateUrl: './product.html',
  styleUrls: ['./product.scss'],
})
export class Product {

  // ✅ TIPADO CORRECTO: Es un SIGNAL, no un Product
  product!: WritableSignal<ProductModel | null>;
  error!: WritableSignal<string | null>;

  // Expose Math to template
  Math = Math;

  // NEW: Variant selections
  selectedImage = signal<number>(0);
  selectedColor = signal<string>('');
  selectedSize = signal<string>('');
  quantity = signal<number>(1);
  customMessage = signal<string>('');

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService
  ) {
    // Subscribe to route parameters to handle navigation between products
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      console.log('Product Component: Route param changed, ID:', id);
      if (id) {
        this.productService.fetchProductById(id);
        // Reset quantity and selections when product changes
        this.quantity.set(1);
        this.selectedImage.set(0);
        this.selectedColor.set('');
        this.selectedSize.set('');
      }
    });

    // ✅ Asignación correcta
    this.product = this.productService.selectedProduct;
    this.error = this.productService.error;

    effect(() => {
      console.log('Product Component: Product signal updated:', this.product());
    });
  }

  // Computed property to ensure arrays exist (Fallback Logic)
  productData = computed(() => {
    const p = this.product();
    if (!p) return null;
    return {
      ...p,
      colors: p.colors || [],
      sizes: p.sizes || [],
      specs: p.specs || [],
      reviews: p.reviews || [],
      priceTiers: p.priceTiers || [],
      features: p.features || []
    };
  });

  related = computed(() => {
    const p = this.product();
    if (!p) return [];

    return this.productService
      .products()
      .filter(x => x.category === p.category && x._id !== p._id);
  });

  // NEW: Get current pricing tier based on quantity
  currentTier = computed(() => {
    const p = this.productData();
    if (!p || !p.priceTiers || p.priceTiers.length === 0) {
      return { min: 1, max: Infinity, discount: 0, label: '1+' };
    }

    const qty = this.quantity();
    return p.priceTiers.find(tier => qty >= tier.min && qty <= tier.max) || p.priceTiers[0];
  });

  // NEW: Get size multiplier
  sizeMultiplier = computed(() => {
    const p = this.productData();
    if (!p || !p.sizes || p.sizes.length === 0) return 1;

    const selectedSizeName = this.selectedSize();
    const size = p.sizes.find(s => s.name === selectedSizeName);
    return size?.priceMultiplier || 1;
  });

  // NEW: Calculate current price per unit
  currentPrice = computed(() => {
    const p = this.product();
    if (!p) return 0;

    const basePrice = p.basePrice || p.price;
    const tier = this.currentTier();
    const multiplier = this.sizeMultiplier();

    return basePrice * multiplier * (1 - tier.discount);
  });

  // NEW: Calculate total price
  totalPrice = computed(() => {
    return this.currentPrice() * this.quantity();
  });

  // NEW: Calculate savings
  savings = computed(() => {
    const p = this.product();
    if (!p) return 0;

    const basePrice = p.basePrice || p.price;
    const tier = this.currentTier();
    return basePrice * this.quantity() * tier.discount;
  });

  categoryPath(category: string): string {
    const paths: Record<string, string> = {
      'bazar': '/bazar',
      'papeleria': '/papeleria',
      'oficina': '/oficina',
      'hogar': '/bazar/hogar',
      'navidad': '/bazar/navidad',
      'bisuteria': '/bazar/bisuteria',
      'bolsos': '/bazar/bolsos',
      'comida': '/bazar/comida',
      'carton': '/papeleria/carton',
      'cartulina': '/papeleria/cartulina',
      'papel': '/papeleria/papel',
      'arquitectura': '/papeleria/arquitectura',
      'manualidades': '/papeleria/manualidades',
      'pinturas': '/papeleria/pinturas',
      'utiles-escolares': '/papeleria/utiles-escolares',
    };
    return paths[category.toLowerCase()] || '/';
  }

  // NEW: Event handlers
  onImageSelect(index: number): void {
    this.selectedImage.set(index);
  }

  onColorSelect(color: string): void {
    this.selectedColor.set(color);
  }

  onSizeSelect(size: string): void {
    this.selectedSize.set(size);
  }

  onQuantityChange(qty: number): void {
    this.quantity.set(qty);
  }

  onCustomMessageChange(message: string): void {
    this.customMessage.set(message);
  }

  onAddToCart(event: { id: string; quantity: number; customMessage?: string }): void {
    console.log('Add to cart:', event);
    // TODO: Implement cart service integration
  }

  onBuyNow(event: { id: string; quantity: number; customMessage?: string }): void {
    console.log('Buy now:', event);
    // TODO: Implement buy now navigation to checkout
  }

  onNotify(message: string): void {
    console.log('Notification:', message);
    // TODO: Implement toast/notification service
  }

  onTierSelect(minQuantity: number): void {
    this.quantity.set(minQuantity);
  }
}