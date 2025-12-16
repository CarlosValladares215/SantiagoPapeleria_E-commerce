import { Component, computed, signal, WritableSignal, effect, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Product as ProductModel, PriceTier, Variant } from '../../models/product.model';

// SHARED
import { ToastContainerComponent } from '../../shared/components/toast/toast.component';

// COMPONENTES
import { ProductBreadcrumb } from './components/product-breadcrumb/product-breadcrumb';
import { ProductSpecs } from './components/product-specs/product-specs';
import { ProductReviews } from './components/product-reviews/product-reviews';
import { ProductActions } from './components/product-actions/product-actions';
import { ProductRelated } from './components/product-related/product-related';
import { ProductImageGallery } from './components/product-image-gallery/product-image-gallery';

import { PricingTiers } from './components/pricing-tiers/pricing-tiers';
import { PriceSummary } from './components/price-summary/price-summary';
import { TrustBadges } from './components/trust-badges/trust-badges';
import { ShippingInfo } from './components/shipping-info/shipping-info';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [
    CommonModule,
    ToastContainerComponent,
    ProductBreadcrumb,
    ProductSpecs,
    ProductReviews,
    ProductActions,
    ProductRelated,
    ProductImageGallery,
    PricingTiers,
    PriceSummary,
    TrustBadges,
    ShippingInfo
  ],
  templateUrl: './product.html',
  styleUrls: ['./product.scss'],
})
export class Product {

  // Signals
  product!: WritableSignal<ProductModel | null>;
  error!: WritableSignal<string | null>;

  // Toast Ref
  @ViewChild(ToastContainerComponent) toast!: ToastContainerComponent;

  relatedProducts = signal<ProductModel[]>([]);

  // Expose Math to template
  Math = Math;

  // Selections
  selectedImage = signal<number>(0);
  quantity = signal<number>(1);
  customMessage = signal<string>('');
  selections = signal<Record<string, string>>({}); // { "Color": "Rojo" }

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService
  ) {
    // 1. Init Base Signals
    this.product = this.productService.selectedProduct;
    this.error = this.productService.error;

    // 2. Handle Route Changes
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      console.log('Product Component: Route param changed, ID:', id);
      if (id) {
        this.productService.fetchProductById(id);

        // Reset Local State
        this.quantity.set(1);
        this.selectedImage.set(0);
        this.customMessage.set('');
        this.selections.set({});
      }
    });

    // 3. Effect: When Product Loads, fetch related and set defaults
    effect(() => {
      const p = this.product();
      if (p) {
        // Fetch Related
        untracked(() => {
          this.productService.fetchRelatedProducts(p.category, p._id).subscribe(related => {
            this.relatedProducts.set(related);
          });
        });

        // Set Default Variant Options if not set
        if (p.has_variants && p.variant_groups?.length) {
          const current = untracked(this.selections);
          const newSelections = { ...current };
          let changed = false;

          p.variant_groups.forEach(group => {
            if (!newSelections[group.nombre] && group.opciones.length > 0) {
              newSelections[group.nombre] = group.opciones[0];
              changed = true;
            }
          });

          if (changed) {
            this.selections.set(newSelections);
          }
        }
      }
    });
  }

  // --- COMPUTED STATE ---

  // All Product Data (Safe Access)
  productData = computed(() => {
    const p = this.product();
    if (!p) return null;

    // Merge enriched data into Specs for display
    const mergedSpecs = [...(p.specs || [])];

    if (p.weight_kg) {
      mergedSpecs.push({ label: 'Peso', value: `${p.weight_kg} kg` });
    }

    if (p.dimensions) {
      const { largo, ancho, alto, unidad } = p.dimensions;
      if (largo || ancho || alto) {
        mergedSpecs.push({
          label: 'Dimensiones',
          value: `${largo || 0}x${ancho || 0}x${alto || 0} ${unidad || 'cm'}`
        });
      }
    }

    // Also include dynamic attributes in specs if desired, or keep them separate.
    // Let's include them for completeness if not already present.
    if (p.attributes) {
      p.attributes.forEach(attr => {
        // Avoid duplicates if already in specs (simple check)
        if (!mergedSpecs.find(s => s.label === attr.key)) {
          mergedSpecs.push({ label: attr.key, value: attr.value });
        }
      });
    }

    return {
      ...p,
      specs: mergedSpecs,
      reviews: p.reviews || [],
      priceTiers: p.priceTiers || [],
      features: p.features || [],
      attributes: p.attributes || []
    };
  });

  // Selected Variant (if any matches selections)
  selectedVariant = computed(() => {
    const p = this.productData();
    if (!p || !p.has_variants || !p.variants) return null;

    const currentSelections = this.selections();

    return p.variants.find(v => {
      // Check if every key in variant.combinacion matches currentSelections
      return Object.entries(v.combinacion).every(([key, val]) => currentSelections[key] === val);
    }) || null;
  });

  // Effective Stock (Variant vs Global)
  currentStock = computed(() => {
    const p = this.productData();
    if (!p) return 0;

    const v = this.selectedVariant();
    if (v) return v.stock;

    return p.stock;
  });

  // Effective Base Price
  basePrice = computed(() => {
    const p = this.productData();
    if (!p) return 0;

    const v = this.selectedVariant();
    // If variant has specific price, use it. Otherwise use product price.
    if (v && v.precio_especifico) return v.precio_especifico;

    return p.basePrice || p.price;
  });

  // Current Wholesale Tier
  currentTier = computed(() => {
    const p = this.productData();
    if (!p || !p.priceTiers || p.priceTiers.length === 0) {
      return { min: 1, max: Infinity, discount: 0, label: '1+' };
    }

    const qty = this.quantity();
    // Validate we have enough stock for this tier? logic usually is "if you buy X amount", stock check is separate
    return p.priceTiers.find(tier => qty >= tier.min && qty <= tier.max) || p.priceTiers[0];
  });

  // Final Price Per Unit (Base * Discount)
  currentPrice = computed(() => {
    const base = this.basePrice();
    const tier = this.currentTier();
    return base * (1 - tier.discount);
  });

  // Total Price
  totalPrice = computed(() => {
    return this.currentPrice() * this.quantity();
  });

  // Savings
  savings = computed(() => {
    const base = this.basePrice();
    const tier = this.currentTier();
    return base * this.quantity() * tier.discount;
  });

  // --- ACTIONS ---

  categoryPath(category: string): string {
    // Simplified path logic or same map
    return `/products?category=${category}`;
  }

  onImageSelect(index: number): void {
    this.selectedImage.set(index);
  }

  onOptionSelect(groupName: string, value: string): void {
    const current = this.selections();
    this.selections.set({ ...current, [groupName]: value });
  }

  onQuantityChange(qty: number): void {
    this.quantity.set(qty);
  }

  onCustomMessageChange(message: string): void {
    this.customMessage.set(message);
  }

  onTierSelect(minQuantity: number): void {
    this.quantity.set(minQuantity);
  }

  onAddToCart(event: any): void {
    const p = this.productData();
    if (!p) return;

    const stock = this.currentStock();
    const qty = this.quantity();

    if (stock < qty) {
      this.onNotify('Stock insuficiente para la cantidad seleccionada.', 'error');
      return;
    }

    // Format for Cart
    const variant = this.selectedVariant();
    const options = {
      customMessage: this.customMessage(),
      priceTier: this.currentTier(),
      ...this.selections(), // Include raw selection map (Color: Rojo)
      variantId: variant?.id
    };

    // Override price in cart item if variant/tier affects it?
    // CartService usually recalculates or takes snapshot. 
    // We send a snapshot object if CartService allows.

    // Construct a "Cart Product" snapshot
    const cartProduct = {
      ...p,
      price: this.currentPrice(), // Price per unit PAID
      stock: stock
    };

    this.cartService.addToCart(cartProduct, qty, options);
    this.onNotify('Producto agregado al carrito', 'success');
  }

  onBuyNow(event: any): void {
    this.onAddToCart(event);
    // Navigate to checkout
    // this.router.navigate(['/checkout']);
  }

  onNotify(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.toast) {
      this.toast.add(message, type);
    } else {
      // Fallback mainly for unit test environments or before view Init
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}