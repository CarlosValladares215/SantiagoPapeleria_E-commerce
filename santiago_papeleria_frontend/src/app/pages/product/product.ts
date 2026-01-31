import { Component, computed, signal, WritableSignal, effect, untracked, ViewChild, OnDestroy, ChangeDetectorRef } from '@angular/core';
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

  // Countdown and Favorites
  countdownDisplay = signal<string | null>(null);
  isFavorite = signal<boolean>(false);
  private countdownInterval: any;

  // --- COMPUTED STATE ---

  // All Product Data (Safe Access)
  productData = computed(() => {
    const p = this.product();
    if (!p) return null;

    const mergedSpecs = [...(p.specs || [])];

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

    if (p.attributes && p.attributes.length > 0) {
      p.attributes.forEach(attr => {
        const exists = mergedSpecs.some(s => s.label.toLowerCase() === attr.key.toLowerCase());
        if (!exists) {
          mergedSpecs.push({ label: attr.key, value: attr.value });
        }
      });
    }

    return {
      ...p,
      weight_kg: weight,
      description: p.descripcion_extendida || p.description,
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

    // Check for active promotion first (Overrides everything)
    if (p.promocion_activa) {
      return p.promocion_activa.precio_descuento;
    }

    const v = this.selectedVariant();
    let price = v && v.precio_especifico ? v.precio_especifico : (p.basePrice || p.price);

    // Wholesale Condition: User is Mayorista OR Quantity >= 12
    const isMayorista = this.authService.isMayorista();
    const qty = this.quantity();

    // Check if wholesale applies
    if (isMayorista || qty >= 12) {
      if (p.wholesalePrice) {
        price = p.wholesalePrice;
      }
    }

    return price;
  });

  // Helper to know if wholesale price is applied due to quantity (for retail users)
  isWholesaleQuantityApplied = computed(() => {
    return !this.authService.isMayorista() && this.quantity() >= 12;
  });

  // Helper to determine if we should show tiers
  shouldShowPricingTiers = computed(() => this.authService.isMayorista());

  // Current Wholesale Tier
  currentTier = computed(() => {
    const p = this.productData();
    if (!this.authService.isMayorista() || !p || !p.priceTiers || p.priceTiers.length === 0) {
      return { min: 1, max: Infinity, discount: 0, label: '1+' };
    }

    const qty = this.quantity();
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

  // --- COMPUTED: Cart Item Logic (Must be defined AFTER productData) ---
  cartItem = computed(() => {
    const p = this.productData();
    if (!p) return null;

    const items = this.cartService.cartItems();
    const targetId = p._id; // The main product ID
    return items.find(i => i.id === targetId) || null;
  });

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
      const slug = params.get('slug') || params.get('id');
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

    // 3. Effect: Fetch Related
    effect(() => {
      const p = this.product();
      if (p) {
        untracked(() => {
          this.productService.fetchRelatedProducts(p.category, p._id).subscribe((related: ProductModel[]) => {
            this.relatedProducts.set(related);
          });
        });

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

    // 4. New Effect: Sync Cart -> Quantity Input
    effect(() => {
      const item = this.cartItem();
      if (item) {
        const currentQty = untracked(this.quantity);
        if (currentQty !== item.quantity) {
          this.quantity.set(item.quantity);
        }
      }
    }, { allowSignalWrites: true });

    // Debug Effect
    effect(() => {
      console.log('🔍 DEBUG STOCK:', {
        product: this.product()?._id,
        selectedVariant: this.selectedVariant(),
        currentStock: this.currentStock(),
        selections: this.selections()
      });
    });

    // Favorites Effect - Check favorite status when product loads
    effect(() => {
      const p = this.product();
      if (p) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        this.isFavorite.set(favorites.includes(p._id));
      }
    }, { allowSignalWrites: true });

    // Countdown Effect - Start countdown when product with promotion loads
    effect(() => {
      const p = this.product();
      const endDate = p?.promocion_activa?.fecha_fin;
      if (endDate) {
        // Clear existing interval
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
        // Start countdown
        this.updateCountdown(endDate);
        this.countdownInterval = setInterval(() => {
          this.updateCountdown(endDate);
        }, 1000);
      } else {
        this.countdownDisplay.set(null);
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
      }
    }, { allowSignalWrites: true });
  }

  // --- ACTIONS ---

  categoryPath(category: string): string {
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
    const p = this.productData();
    if (!p) return;

    this.quantity.set(qty);

    // Sync to Cart if exists
    const item = untracked(this.cartItem);
    if (item) {
      const success = this.cartService.updateQuantity(item.id, qty);
      if (!success) {
        this.onNotify('Stock máximo alcanzado', 'error');
      }
    }
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
      this.onNotify('Stock insuficiente.', 'error');
      return;
    }

    const variant = this.selectedVariant();
    const options = {
      customMessage: this.customMessage(),
      priceTier: this.currentTier(),
      ...this.selections(),
      variantId: variant?.id
    };

    const cartProduct = {
      ...p,
      price: this.currentPrice(),
      stock: stock
    };

    const existing = this.cartItem();
    let success = false;
    if (existing) {
      success = this.cartService.updateQuantity(existing.id, qty);
      if (success) {
        this.onNotify('Carrito actualizado', 'success');
      } else {
        // If update failed (capped), implies stock reached
        this.onNotify('No se puede agregar más cantidad. Stock insuficiente.', 'error');
      }
    } else {
      success = this.cartService.addToCart(cartProduct, qty, options);
      if (success) {
        this.onNotify('Producto agregado al carrito', 'success');
      } else {
        this.onNotify('No se pudo agregar todo lo solicitado. Stock insuficiente.', 'error');
      }
    }
  }

  onBuyNow(event: any): void {
    this.onAddToCart(event);
    this.router.navigate(['/cart']);
  }

  onNotify(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    if (this.toast) {
      this.toast.add(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  startPolling(id: string) {
    if (this.pollingSub) this.pollingSub.unsubscribe();
    this.pollingSub = interval(5000).subscribe(() => {
      this.productService.fetchProductById(id, true);
    });
  }

  // --- FAVORITES ---

  toggleFavorite(): void {
    // Check if user is logged in
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const p = this.product();
    if (!p) return;

    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const currentFav = this.isFavorite();

    if (currentFav) {
      const index = favorites.indexOf(p._id);
      if (index > -1) favorites.splice(index, 1);
    } else {
      favorites.push(p._id);
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
    this.isFavorite.set(!currentFav);
    this.onNotify(currentFav ? 'Eliminado de favoritos' : 'Agregado a favoritos', 'success');
  }

  // --- COUNTDOWN ---

  private updateCountdown(endDate: string | Date): void {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      this.countdownDisplay.set('¡Oferta terminada!');
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (days > 0) {
      this.countdownDisplay.set(`${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    } else {
      this.countdownDisplay.set(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    }
  }

  ngOnDestroy() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }
}