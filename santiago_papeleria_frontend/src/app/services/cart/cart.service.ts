import { Injectable, signal, computed, inject, effect, Injector } from '@angular/core';
import { UiService } from '../ui/ui.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { DireccionEntrega } from '../../models/usuario.model';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';

export interface CartItem {
    id: string;
    sku: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    options?: any;
    // Shipping data
    weight_kg?: number;
    dimensions?: {
        largo: number;
        ancho: number;
        alto: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class CartService {
    private uiService = inject(UiService);
    private http = inject(HttpClient);
    private authService = inject(AuthService); // Inject AuthService
    private apiUrl = 'http://localhost:3000/api/usuarios';

    // Sync with UiService observables
    private _isOpen = toSignal(this.uiService.isCartOpen$, { initialValue: false });

    // Internal state signal
    private cartItemsSignal = signal<CartItem[]>(this.loadFromStorage());

    // ... (Shipping State remains same)
    selectedAddress = signal<DireccionEntrega | null>(null);
    shippingCost = signal<number>(0);
    deliveryMethod = signal<'shipping' | 'pickup'>('shipping');
    paymentMethod = signal<'transfer' | 'cash' | null>(null);

    // ... (Constants remain same)
    private readonly STORE_LOCATION = { lat: -3.99313, lng: -79.20422 };
    private readonly RATE_BASE = 2.50;
    private readonly RATE_PER_KM = 0.35;
    private readonly RATE_PER_KG = 0.25;

    // ... (Public signals remain same)
    isOpen = computed(() => this._isOpen());
    cartItems = computed(() => this.cartItemsSignal());

    // Computed totals
    totalItems = computed(() => this.cartItemsSignal().reduce((acc, item) => acc + item.quantity, 0));
    totalValue = computed(() => this.cartItemsSignal().reduce((acc, item) => acc + (item.price * item.quantity), 0));
    finalTotal = computed(() => this.totalValue() + this.shippingCost());
    cartCount = this.totalItems;

    constructor() {
        // 1. Effect: Sync changes TO LocalStorage & Backend
        effect(() => {
            const items = this.cartItemsSignal();
            this.saveToStorage(items);
            this.calculateShipping();

            // Sync to Backend if User is Logged In
            const user = this.authService.user();
            if (user && user._id) {
                this.saveCartToBackend(user._id, items);
            }
        });

        // 2. Effect: Recalculate if address changes
        effect(() => {
            const addr = this.selectedAddress();
            this.calculateShipping();
        }, { allowSignalWrites: true });

        // 3. Effect: React to User Login/Logout (Sync FROM Backend)
        effect(() => {
            const user = this.authService.user();
            if (user) {
                // User Logged In: Load their cart (overwrite local)
                // Note: We might want to merge, but user asked for "appear their data", implying server state wins.
                // However, user.carrito might be null/undefined initially or empty.
                if (user.carrito && Array.isArray(user.carrito)) {
                    // Map backend schema to CartItem if needed, or assume match
                    // Mongoose might return _id, frontend uses id. existingItemIndex check uses .id
                    // Let's ensure compatibility.
                    const mappedCart = user.carrito.map((c: any) => ({
                        ...c,
                        id: c.id || c._id // Ensure ID exists
                    }));
                    // Allow writes to update signal from within effect
                    // We use untracked to avoid loop?? No, we want this to run only when USER changes.
                    // But setting cartItemsSignal triggers Effect #1 which saves back to backend.
                    // This loop (Load -> Set -> Save) is slight redundancy but harmless usually.
                    // To avoid infinite loop (Save -> User Update -> Load...), we need to be careful.
                    // Ideally, updateCart endpoint shouldn't trigger a full user reload that changes the object reference heavily.
                    // Or we can check deep equality.
                    // For now, let's just set it.
                    // We need allowSignalWrites because we are writing to cartItemsSignal inside an effect.

                    // CRITICAL: Only set if different to avoid cycle/flicker?
                    // Just setting it.

                    // To avoid the cycle of "Set Signal -> Save to Backend -> Update User -> Set Signal",
                    // The "Save to Backend" doesn't necessarily update the local `authService.user` signal unless we explicity do so.
                    // `saveCartToBackend` just sends PUT. It returns the new cart. We usually ignore it or update local state?
                    // If we don't update `authService.user` with the response, the effect watching `authService.user` won't re-fire.
                    // So it stops the loop.

                    this.cartItemsSignal.set(mappedCart);
                }
            } else {
                // User Logged Out: Clear Cart
                this.cartItemsSignal.set([]); // Clear local cart
            }
        }, { allowSignalWrites: true });
    }

    private saveCartToBackend(userId: string, items: CartItem[]) {
        // Debounce logic could be good here, but for now direct call
        // We use subscribe but don't strictly wait.
        // Also: items might have Circular structures if not careful? No, they are POJOs.
        this.http.put(`${this.apiUrl}/${userId}/cart`, items).subscribe({
            next: (res) => console.log('Cart synced to backend'),
            error: (err) => console.error('Failed to sync cart', err)
        });
    }

    addToCart(product: any, quantity: number = 1, options: any = {}) {
        const currentItems = this.cartItemsSignal();
        const productId = product.id || product._id || product.internal_id;

        const existingItemIndex = currentItems.findIndex(item => item.id === productId);

        if (existingItemIndex > -1) {
            const updatedItems = [...currentItems];
            updatedItems[existingItemIndex] = {
                ...updatedItems[existingItemIndex],
                quantity: updatedItems[existingItemIndex].quantity + quantity
            };
            this.cartItemsSignal.set(updatedItems);
        } else {
            const newItem: CartItem = {
                id: productId,
                name: product.name || product.webName || 'Producto sin nombre',
                price: parseFloat(product.price) || 0,
                image: this.resolveImage(product),
                quantity: quantity,
                sku: product.sku || product.codigo_interno || '',
                options: options,
                weight_kg: product.weight_kg || product.weight || 0,
                dimensions: product.dimensions
            };
            this.cartItemsSignal.set([...currentItems, newItem]);
        }
        this.openCart();
    }

    private resolveImage(product: any): string {
        if (typeof product.image === 'string' && product.image) return product.image;
        if (Array.isArray(product.images) && product.images.length > 0) return product.images[0];
        return 'assets/images/placeholder.png';
    }

    removeFromCart(itemId: string) {
        const currentItems = this.cartItemsSignal();
        this.cartItemsSignal.set(currentItems.filter(item => item.id !== itemId));
    }

    updateQuantity(itemId: string, quantity: number) {
        if (quantity < 1) return;
        const currentItems = this.cartItemsSignal();
        const index = currentItems.findIndex(item => item.id === itemId);
        if (index > -1) {
            const updatedItems = [...currentItems];
            updatedItems[index] = { ...updatedItems[index], quantity: quantity };
            this.cartItemsSignal.set(updatedItems);
        }
    }

    clearCart() {
        this.cartItemsSignal.set([]);
    }

    // --- Shipping Logic ---
    setAddress(address: DireccionEntrega | null) {
        this.selectedAddress.set(address);
    }

    setDeliveryMethod(method: 'shipping' | 'pickup') {
        this.deliveryMethod.set(method);
        this.calculateShipping(); // Recalculate cost
    }

    setPaymentMethod(method: 'transfer' | 'cash') {
        this.paymentMethod.set(method);
    }

    private calculateShipping() {
        if (this.deliveryMethod() === 'pickup') {
            this.shippingCost.set(0);
            return;
        }

        const address = this.selectedAddress();
        const items = this.cartItemsSignal();

        if (!address) {
            console.warn('Shipping: No address selected');
            this.shippingCost.set(0);
            return;
        }

        if (!address.location) {
            console.warn('Shipping: Selected address has no location data', address);
            this.shippingCost.set(0);
            return;
        }

        if (items.length === 0) {
            this.shippingCost.set(0);
            return;
        }

        try {
            console.log('Calculating shipping for:', address.alias, address.location);

            // 1. Distance
            const distKm = this.getDistanceFromLatLonInKm(
                this.STORE_LOCATION.lat, this.STORE_LOCATION.lng,
                Number(address.location.lat), Number(address.location.lng) // Ensure numbers
            );
            console.log('Distance (km):', distKm);

            // 2. Weight
            let totalRealWeight = 0;
            let totalVolumetricWeight = 0;

            items.forEach(item => {
                const q = item.quantity;
                const w = Number(item.weight_kg || 0);
                totalRealWeight += w * q;

                if (item.dimensions) {
                    const l = Number(item.dimensions.largo || 0);
                    const an = Number(item.dimensions.ancho || 0);
                    const al = Number(item.dimensions.alto || 0);
                    const vol = (l * an * al) / 5000;
                    totalVolumetricWeight += vol * q;
                }
            });

            const chargeableWeight = Math.max(totalRealWeight, totalVolumetricWeight);
            console.log('Weights - Real:', totalRealWeight, 'Volumetric:', totalVolumetricWeight, 'Chargeable:', chargeableWeight);

            // 3. Formula
            let cost = this.RATE_BASE;
            cost += distKm * this.RATE_PER_KM;
            cost += chargeableWeight * this.RATE_PER_KG;

            console.log('Calculated Cost:', cost);

            const finalCost = Math.round(cost * 100) / 100;
            console.log('Final Round Cost:', finalCost);

            this.shippingCost.set(finalCost);
        } catch (error) {
            console.error('Error calculating shipping:', error);
            this.shippingCost.set(0);
        }
    }

    private getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }

    // --- Storage ---
    private saveToStorage(items: CartItem[]) {
        localStorage.setItem('cart', JSON.stringify(items));
    }

    private loadFromStorage(): CartItem[] {
        const stored = localStorage.getItem('cart');
        try {
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to parse cart', e);
            return [];
        }
    }

    // --- UI Helpers ---
    toggleCart() { this.uiService.toggleCart(); }
    openCart() { if (!this.isOpen()) this.uiService.toggleCart(); }
    closeCart() { this.uiService.closeCart(); }
}
