import { Component, computed, signal, WritableSignal, effect, untracked, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription, interval } from 'rxjs';

import { ProductService } from '../../services/product/product.service';
import { CartService } from '../../services/cart/cart.service';
import { AuthService } from '../../services/auth/auth.service';
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

import { TrustBadges } from './components/trust-badges/trust-badges';
import { ShippingInfo } from './components/shipping-info/shipping-info';
import { PricingTiers } from './components/pricing-tiers/pricing-tiers';

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
    TrustBadges,
    ProductImageGallery,
    TrustBadges,
    ShippingInfo,
    PricingTiers
  ],
  templateUrl: './product.html',
  styleUrls: ['./product.scss'],
})
export class Product implements OnDestroy {

  // Signals
  product!: WritableSignal<ProductModel | null>;
  error!: WritableSignal<string | null>;

  // Toast Ref
  @ViewChild(ToastContainerComponent) toast!: ToastContainerComponent;

  relatedProducts = signal<ProductModel[]>([]);
  private pollingSub: Subscription | null = null;

  // Expose Math to template
  Math = Math;

  // Selections
  selectedImage = signal<number>(0);
  quantity = signal<number>(1);
  customMessage = signal<string>('');
  selections = signal<Record<string, string>>({}); // { "Color": "Rojo" }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService
  ) {
    // 1. Init Base Signals
    this.product = this.productService.selectedProduct;
    this.error = this.productService.error;

    // 2. Handle Route Changes
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') || params.get('id'); // Support slug (primary) or id (fallback)
      console.log('Product Component: Route param changed, Slug/ID:', slug);
      if (slug) {
        this.productService.fetchProductById(slug);
        this.startPolling(slug);

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
          this.productService.fetchRelatedProducts(p.category, p._id).subscribe((related: ProductModel[]) => {
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

    // Dentro del constructor, después del effect:
    effect(() => {
      console.log('🔍 DEBUG STOCK:', {
        product: this.product()?._id,
        selectedVariant: this.selectedVariant(),
        currentStock: this.currentStock(),
        selections: this.selections()
      });
    });
  }

  // --- COMPUTED STATE ---

  // All Product Data (Safe Access)
  productData = computed(() => {
    const p = this.product();
    if (!p) return null;

    // Merge enriched data into Specs for display
    // Merge enriched data into Specs for display
    const mergedSpecs = [...(p.specs || [])];

    // Priority to Enriched Weight_KG
    const weight = p.weight_kg !== undefined ? p.weight_kg : p.weight;
    if (weight && weight > 0) {
      mergedSpecs.push({ label: 'Peso', value: `${weight} kg` });
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

    // Include dynamic attributes in specs
    if (p.attributes && p.attributes.length > 0) {
      p.attributes.forEach(attr => {
        // Avoid duplicates if already in specs (simple check)
        const exists = mergedSpecs.some(s => s.label.toLowerCase() === attr.key.toLowerCase());
        if (!exists) {
          mergedSpecs.push({ label: attr.key, value: attr.value });
        }
      });
    }

    return {
      ...p,
      // Ensure we expose standard accessors for template
      weight_kg: weight,
      description: p.descripcion_extendida || p.description, // Prefer enriched description
      allows_custom_message: p.allows_custom_message !== undefined ? p.allows_custom_message : p.allowCustomMessage,
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

  // Effective Base Price based on Variant and User Type
  basePrice = computed(() => {
    const p = this.productData();
    if (!p) return 0;

    const v = this.selectedVariant();
    // 1. Variant specific price? matches selection
    let price = v && v.precio_especifico ? v.precio_especifico : (p.basePrice || p.price);

    // 2. Override with Wholesale Price if applicable and no specific variant price override?
    // Actually, usually Variants also have wholesale prices. But assuming simple product level wholesale for now or if p.wholesalePrice exists.
    // If user is Mayorista, check if there is a wholesale price
    if (this.authService.isMayorista()) {
      // If variant has specific price, we might need a specific wholesale price too. 
      // For now assuming wholesalePrice is on main product.
      // If p.wholesalePrice exists, use it.
      if (p.wholesalePrice) {
        price = p.wholesalePrice;
      }
    }

    return price;
  });

  // Helper to determine if we should show tiers
  shouldShowPricingTiers = computed(() => this.authService.isMayorista());

  // Current Wholesale Tier
  currentTier = computed(() => {
    const p = this.productData();
    // Only apply tiers if Mayorista
    if (!this.authService.isMayorista() || !p || !p.priceTiers || p.priceTiers.length === 0) {
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
    this.router.navigate(['/cart']);
  }

  onNotify(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.toast) {
      this.toast.add(message, type);
    } else {
      // Fallback mainly for unit test environments or before view Init
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  startPolling(id: string) {
    if (this.pollingSub) this.pollingSub.unsubscribe();
    // Poll every 5 seconds for real-time stock updates
    this.pollingSub = interval(5000).subscribe(() => {
      this.productService.fetchProductById(id, true);
    });
  }

  ngOnDestroy() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
  }
}