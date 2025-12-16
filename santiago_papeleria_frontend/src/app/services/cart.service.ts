import { Injectable, signal, computed, inject } from '@angular/core';
import { UiService } from './ui.service';
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

    constructor() { }

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
