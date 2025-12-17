import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { UiService } from '../ui/ui.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
    providedIn: 'root'
})
export class CartService {
    private uiService = inject(UiService);

    // Sync with UiService observables
    private _isOpen = toSignal(this.uiService.isCartOpen$, { initialValue: false });
    private _cartCount = toSignal(this.uiService.cartItemCount$, { initialValue: 0 });

    // Expose signals as expected by the new Header component
    isOpen = computed(() => this._isOpen());
    cartCount = computed(() => this._cartCount());

    private cartItemsSignal = signal<CartItem[]>(this.loadFromStorage());

    // Public signals
    cartItems = computed(() => this.cartItemsSignal());
    totalItems = computed(() => this.cartItemsSignal().reduce((acc, item) => acc + item.quantity, 0));
    totalValue = computed(() => this.cartItemsSignal().reduce((acc, item) => acc + (item.price * item.quantity), 0));

    constructor() {
        // Effect to sync count with UiService if needed, or better, let Header consume CartService directly
        // For backward compatibility with UiService's cartCount:
        effect(() => {
            // Update UI Service count when cart changes
            // Note: UiService expects an observable or manual update. 
            // If UiService.cartCount is a BehaviorSubject, we can't update it easily if it's read-only.
            // Assuming we will migrate Header to use CartService directly.
        });
    }

    addToCart(product: any, quantity: number = 1, options: any = {}) {
        const currentItems = this.cartItemsSignal();
        const existingItemIndex = currentItems.findIndex(item => item.id === product.id || item.id === product._id);

        if (existingItemIndex > -1) {
            // Update quantity
            const updatedItems = [...currentItems];
            updatedItems[existingItemIndex].quantity += quantity;
            this.cartItemsSignal.set(updatedItems);
        } else {
            // Add new item
            const newItem: CartItem = {
                id: product.id || product._id,
                name: product.name || product.webName || product.erpName,
                price: product.price, // Should handle tiered pricing here if needed? usually simpler to take current price
                image: product.image || (product.images && product.images[0]) || '',
                quantity: quantity,
                sku: product.sku || product.codigo_interno,
                options: options
            };
            this.cartItemsSignal.set([...currentItems, newItem]);
        }

        this.saveToStorage();
        this.openCart(); // Auto open cart on add

        // Optional: Toast
    }

    removeFromCart(itemId: string) {
        const currentItems = this.cartItemsSignal();
        this.cartItemsSignal.set(currentItems.filter(item => item.id !== itemId));
        this.saveToStorage();
    }

    updateQuantity(itemId: string, quantity: number) {
        if (quantity <= 0) {
            this.removeFromCart(itemId);
            return;
        }

        const currentItems = this.cartItemsSignal();
        const index = currentItems.findIndex(item => item.id === itemId);
        if (index > -1) {
            const updatedItems = [...currentItems];
            updatedItems[index].quantity = quantity;
            this.cartItemsSignal.set(updatedItems);
            this.saveToStorage();
        }
    }

    private saveToStorage() {
        localStorage.setItem('cart', JSON.stringify(this.cartItemsSignal()));
    }

    private loadFromStorage(): CartItem[] {
        const stored = localStorage.getItem('cart');
        return stored ? JSON.parse(stored) : [];
    }

    toggleCart() {
        this.uiService.toggleCart();
    }

    openCart() {
        if (!this.isOpen()) {
            this.uiService.toggleCart();
        }
    }

    closeCart() {
        this.uiService.closeCart();
    }
}

export interface CartItem {
    id: string;
    sku: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    options?: any;
}
