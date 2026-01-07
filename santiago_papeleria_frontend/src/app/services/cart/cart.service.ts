
import { Injectable, signal, computed, inject, effect, Injector } from '@angular/core';
import { UiService } from '../ui/ui.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { DireccionEntrega } from '../../models/usuario.model';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { ShippingService } from '../../services/shipping.service';
import { environment } from '../../../environments/environment';

export interface CartItem {
    id: string;
    sku: string;
    name: string;
    price: number;
    wholesalePrice?: number;
    retailPrice?: number;
    quantity: number;
    image: string;
    stock: number;
    options?: any;
    vat_included?: boolean;
    weight_kg?: number;
    dimensions?: {
        largo: number;
        ancho: number;
        alto: number;
    };
    promocion_id?: string;
}

@Injectable({
    providedIn: 'root'
})
export class CartService {
    private uiService = inject(UiService);
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private shippingService = inject(ShippingService);

    // API URLs
    private apiUrl = `${environment.baseApiUrl}/usuarios`;
    private ordersUrl = `${environment.baseApiUrl}/pedidos`;
    private filesUrl = `${environment.baseApiUrl}/files`;
    private shippingUrl = `${environment.baseApiUrl}/shipping`;

    // Sync with UiService
    private _isOpen = toSignal(this.uiService.isCartOpen$, { initialValue: false });

    // Internal state
    private cartItemsSignal = signal<CartItem[]>(this.loadFromStorage());

    // Shipping State
    selectedAddress = signal<DireccionEntrega | null>(null);
    shippingCost = signal<number>(0);
    deliveryMethod = signal<'shipping' | 'pickup'>('shipping');
    paymentMethod = signal<'transfer' | 'cash' | null>(null);

    // Branch State
    public branches = [
        { id: 1, name: 'Matriz', address: 'Azuay 152-48 entre 18 de Noviembre y Avenida Universitaria', schedule: 'Lunes a Viernes: 08:30 - 13:00 / 15:00 - 18:30' },
        { id: 2, name: 'Sucursal 1', address: 'Almacén UTPL (Campus UTPL, San Cayetano Alto)', schedule: 'Lunes a Viernes: 08:00 - 13:00 / 15:00 - 18:00' },
        { id: 3, name: 'Sucursal 2', address: 'Calle Guaranda y Avenida Cuxibamba', schedule: 'Lunes a Viernes: 09:00 - 13:00 / 15:00 - 19:00' },
    ];
    selectedBranch = signal(this.branches[0]);

    private readonly IVA_RATE = 0.15;

    // Computed Values
    isOpen = computed(() => this._isOpen());
    cartItems = computed(() => this.cartItemsSignal());

    totalItems = computed(() => this.cartItemsSignal().reduce((acc, item) => acc + item.quantity, 0));

    // 1. Items Total (Gross)
    itemsTotal = computed(() => this.cartItemsSignal().reduce((acc, item) => acc + (item.price * item.quantity), 0));

    // 2. Breakdown (Subtotal Excl. VAT & VAT Amount)
    subTotal = computed(() => {
        return this.cartItemsSignal().reduce((acc, item) => {
            const lineTotal = item.price * item.quantity;
            if (item.vat_included) {
                return acc + (lineTotal / (1 + this.IVA_RATE));
            }
            return acc + lineTotal;
        }, 0);
    });

    totalIva = computed(() => {
        return this.cartItemsSignal().reduce((acc, item) => {
            const lineTotal = item.price * item.quantity;
            if (item.vat_included) {
                const base = lineTotal / (1 + this.IVA_RATE);
                return acc + (lineTotal - base);
            } else {
                return acc + (lineTotal * this.IVA_RATE);
            }
        }, 0);
    });

    // 3. Final Totals
    totalValue = computed(() => this.subTotal() + this.totalIva());
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
                // User Logged In: Load their cart
                if (user.carrito && Array.isArray(user.carrito)) {
                    const mappedCart = user.carrito.map((c: any) => ({
                        ...c,
                        id: c.id || c._id
                    }));
                    this.cartItemsSignal.set(mappedCart);
                }

                // Auto-select Default Address if available and none selected
                if (user.direcciones_entrega && user.direcciones_entrega.length > 0 && !this.selectedAddress()) {
                    // Ideally check for 'isDefault' flag, mostly first one is default
                    this.setAddress(user.direcciones_entrega[0]);
                }
            } else {
                // User Logged Out: Clear Cart
                this.cartItemsSignal.set([]);
                this.selectedAddress.set(null);
            }
        }, { allowSignalWrites: true });
    }

    private saveCartToBackend(userId: string, items: CartItem[]) {
        this.http.put(`${this.apiUrl}/${userId}/cart`, items).subscribe({
            next: (res) => console.log('Cart synced to backend'),
            error: (err) => console.error('Failed to sync cart', err)
        });
    }

    addToCart(product: any, quantity: number = 1, options: any = {}) {
        const currentItems = this.cartItemsSignal();
        const productId = product.id || product._id || product.internal_id;

        const isMayoristaUser = this.authService.isMayorista();

        let retailPrice = product.basePrice || product.price || 0;
        let promoId: string | undefined;

        // Apply Promotion if active
        if (product.promocion_activa) {
            retailPrice = product.promocion_activa.precio_descuento;
            promoId = product.promocion_activa.promocion_id;
        }

        const wholesalePrice = product.wholesalePrice || retailPrice;

        const existingItemIndex = currentItems.findIndex(item => item.id === productId);

        if (existingItemIndex > -1) {
            const updatedItems = [...currentItems];
            const item = updatedItems[existingItemIndex];
            const newQty = item.quantity + quantity;

            if (newQty <= item.stock) {
                const applicablePrice = this.calculatePrice(newQty, item.retailPrice || retailPrice, item.wholesalePrice || wholesalePrice, isMayoristaUser);
                updatedItems[existingItemIndex] = {
                    ...item,
                    quantity: newQty,
                    price: applicablePrice,
                    promocion_id: promoId || item.promocion_id
                };
                this.cartItemsSignal.set(updatedItems);
            } else {
                if (item.quantity < item.stock) {
                    const cappedQty = item.stock;
                    const applicablePrice = this.calculatePrice(cappedQty, item.retailPrice || retailPrice, item.wholesalePrice || wholesalePrice, isMayoristaUser);
                    updatedItems[existingItemIndex] = { ...item, quantity: cappedQty, price: applicablePrice };
                    this.cartItemsSignal.set(updatedItems);
                }
            }
        } else {
            const applicablePrice = this.calculatePrice(quantity, retailPrice, wholesalePrice, isMayoristaUser);
            // Ensure promo price applies if lower than any wholesale calculation (unless wholesale is better)
            // But calculatePrice logic might return wholesale if applicable.
            // If retailPrice IS the promo price, calculatePrice returns it for non-wholesale.

            const newItem: CartItem = {
                id: productId,
                name: product.name || product.webName || 'Producto sin nombre',
                price: applicablePrice,
                retailPrice: retailPrice,
                wholesalePrice: wholesalePrice,
                image: this.resolveImage(product),
                quantity: quantity,
                stock: product.stock || 0,
                sku: product.sku || product.codigo_interno || '',
                options: options,
                vat_included: product.vat_included !== undefined ? product.vat_included : true,
                weight_kg: product.weight_kg || product.weight || 0,
                dimensions: product.dimensions,
                promocion_id: promoId
            };
            this.cartItemsSignal.set([...currentItems, newItem]);
        }
        this.openCart();
    }

    validateStock(): boolean {
        const items = this.cartItemsSignal();
        let isValid = true;
        items.forEach(item => {
            if (item.quantity > item.stock) {
                isValid = false;
            }
        });
        return isValid;
    }

    get outOfStockItems(): CartItem[] {
        return this.cartItemsSignal().filter(item => item.stock <= 0 || item.quantity > item.stock);
    }

    private calculatePrice(qty: number, retail: number, wholesale: number, isMayoristaUser: boolean): number {
        if (isMayoristaUser || qty >= 12) {
            return wholesale;
        }
        return retail;
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
            const item = updatedItems[index];
            const isMayoristaUser = this.authService.isMayorista();

            if (quantity <= item.stock) {
                const applicablePrice = this.calculatePrice(quantity, item.retailPrice || item.price, item.wholesalePrice || item.price, isMayoristaUser);
                updatedItems[index] = { ...item, quantity: quantity, price: applicablePrice };
                this.cartItemsSignal.set(updatedItems);
            } else {
                const cappedQty = item.stock;
                const applicablePrice = this.calculatePrice(cappedQty, item.retailPrice || item.price, item.wholesalePrice || item.price, isMayoristaUser);
                updatedItems[index] = { ...item, quantity: cappedQty, price: applicablePrice };
                this.cartItemsSignal.set(updatedItems);
            }
        }
    }

    clearCart() {
        this.cartItemsSignal.set([]);
    }

    createOrder(orderData: any) {
        return this.http.post(this.ordersUrl, orderData);
    }

    uploadTransferProof(file: File) {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<{ url: string }>(`${this.filesUrl}/upload`, formData);
    }

    setAddress(address: DireccionEntrega | null) {
        this.selectedAddress.set(address);
    }

    setDeliveryMethod(method: 'shipping' | 'pickup') {
        this.deliveryMethod.set(method);
        this.calculateShipping();
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

        if (!address || items.length === 0) {
            this.shippingCost.set(0);
            return;
        }

        console.log('Calculating shipping for:', address.alias);

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
        const locationName = address.provincia || address.ciudad || '';

        // Call Backend for Calculation
        this.shippingService.calculateShipping(locationName, chargeableWeight).subscribe({
            next: (res) => {
                this.shippingCost.set(res.cost);
            },
            error: (err) => {
                console.error('Error calculating shipping:', err);
                this.shippingCost.set(0);
            }
        });
    }

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

    toggleCart() { this.uiService.toggleCart(); }
    openCart() { if (!this.isOpen()) this.uiService.toggleCart(); }
    closeCart() { this.uiService.closeCart(); }
}
