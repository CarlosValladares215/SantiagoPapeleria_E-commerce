import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UiService } from '../../../services/ui/ui.service';
import { CartService } from '../../../services/cart/cart.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-cart-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[2000] bg-black/50 transition-opacity" *ngIf="isOpen()" (click)="close()">
      
      <!-- Stop propagation to prevent closing when clicking inside the sidebar -->
      <div class="absolute right-0 top-0 bg-white w-80 h-full shadow-xl flex flex-col transform transition-transform" 
           (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 class="text-lg font-bold text-gray-800">Tu Carrito ({{ cartService.totalItems() }})</h2>
          <button (click)="close()" class="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <i class="fas fa-times text-gray-500"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-4">
          <div *ngIf="cartService.cartItems().length === 0" class="text-center py-10 text-gray-500">
            <i class="fas fa-shopping-cart text-4xl mb-3 opacity-30"></i>
            <p>Tu carrito está vacío</p>
          </div>

          <div *ngFor="let item of cartService.cartItems()" class="flex gap-4 mb-4 border-b pb-4 last:border-0 relative group">
             <!-- Delete Button -->
             <button (click)="cartService.removeFromCart(item.id)" 
                     class="absolute top-0 right-0 text-gray-400 hover:text-red-500 transition-colors p-1"
                     title="Eliminar producto">
               <i class="ri-delete-bin-line"></i>
             </button>

             <div class="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                <img [src]="item.image" alt="{{ item.name }}" class="w-full h-full object-cover">
             </div>
             <div class="flex-1 pr-6"> <!-- Added padding-right to avoid overlap with delete btn -->
               <h3 class="text-sm font-medium line-clamp-2">{{ item.name }}</h3>
               <p class="text-gray-500 text-xs mb-2">{{ item.sku }}</p>
               <div class="flex justify-between items-center">
                 <span class="font-bold text-primary">{{ item.price | currency }}</span>
                 
                 <!-- Quantity Controls -->
                 <div class="flex items-center border rounded">
                   <button (click)="updateQty(item.id, item.quantity - 1)" class="px-2 py-0.5 text-gray-600 hover:bg-gray-100">-</button>
                   <span class="px-2 text-sm">{{ item.quantity }}</span>
                   <button (click)="updateQty(item.id, item.quantity + 1)" class="px-2 py-0.5 text-gray-600 hover:bg-gray-100">+</button>
                 </div>
               </div>
             </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t bg-gray-50">
          <div class="flex justify-between mb-4">
            <span class="text-gray-600">Subtotal</span>
            <span class="font-bold text-lg">{{ cartService.totalValue() | currency }}</span>
          </div>
          <button (click)="goToCheckout()" class="w-full bg-[#104d73] text-white py-3 rounded font-medium hover:bg-[#012e40] transition-colors shadow-lg">
            Proceder al Pago
          </button>
        </div>

      </div>
    </div>
  `,
  styles: []
})
export class CartSidebarComponent {
  private uiService = inject(UiService);
  public cartService = inject(CartService); // Public for template access

  isOpen = toSignal(this.uiService.isCartOpen$, { initialValue: false });

  close() {
    this.uiService.closeCart();
  }

  updateQty(itemId: string, newQty: number) {
    this.cartService.updateQuantity(itemId, newQty);
  }

  private router = inject(Router);

  goToCheckout() {
    this.close();
    this.router.navigate(['/cart']);
  }
}
