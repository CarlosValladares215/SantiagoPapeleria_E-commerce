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
          
          <!-- Stock Alert -->
          <div *ngIf="cartService.outOfStockItems.length > 0" class="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-r animate-pulse">
             <h3 class="text-xs font-bold text-red-800 flex items-center gap-1">
               <i class="ri-error-warning-fill"></i> Stock Insuficiente
             </h3>
             <p class="text-xs text-red-700 mt-1">Algunos items superan la disponibilidad.</p>
          </div>

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

             <div class="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 relative">
                <img [src]="item.image" alt="{{ item.name }}" class="w-full h-full object-cover">
                <!-- Stock Error Overlay -->
                <div *ngIf="item.quantity > item.stock" class="absolute inset-0 bg-red-500/10 border-2 border-red-500 rounded"></div>
             </div>
             <div class="flex-1 pr-6"> <!-- Added padding-right to avoid overlap with delete btn -->
               <h3 class="text-sm font-medium line-clamp-2">{{ item.name }}</h3>
               <p class="text-gray-500 text-xs mb-2">{{ item.sku }}</p>
               
               <!-- Stock Error Text -->
               <p *ngIf="item.quantity > item.stock" class="text-[10px] text-red-600 font-bold mb-1">
                 Solo {{ item.stock }} disponibles
               </p>

               <div class="flex justify-between items-center">
                 <span class="font-bold text-primary">{{ item.price | currency }}</span>
                 
                 <!-- Quantity Controls -->
                 <div class="flex items-center border rounded" [class.border-red-300]="item.quantity > item.stock">
                   <button (click)="updateQty(item.id, item.quantity - 1)" class="px-2 py-0.5 text-gray-600 hover:bg-gray-100">-</button>
                   <span class="px-2 text-sm">{{ item.quantity }}</span>
                   <button (click)="updateQty(item.id, item.quantity + 1)" 
                           class="px-2 py-0.5 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                           [disabled]="item.quantity >= item.stock">+</button>
                 </div>
               </div>
             </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t bg-gray-50">
          <div class="space-y-2 mb-4">
             <div class="flex justify-between text-xs text-gray-600">
               <span>Subtotal</span>
               <span>{{ cartService.subTotal() | currency }}</span>
             </div>
             <div class="flex justify-between text-xs text-gray-600">
               <span>IVA (15%)</span>
               <span>{{ cartService.totalIva() | currency }}</span>
             </div>
             <div class="flex justify-between font-bold text-lg text-[#012e40] pt-2 border-t border-gray-200">
               <span>Total</span>
               <span>{{ cartService.totalValue() | currency }}</span>
             </div>
          </div>

          <div class="flex flex-col gap-2">
            <button (click)="goToCheckout()" 
                    [disabled]="!cartService.validateStock()"
                    class="w-full bg-[#104d73] text-white py-3 rounded font-medium hover:bg-[#012e40] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <span *ngIf="!cartService.validateStock()">Revisar Stock</span>
              <span *ngIf="cartService.validateStock()">Proceder al Pago</span>
            </button>

            <button (click)="continueShopping()" 
                    class="w-full border border-gray-300 text-gray-700 py-2 rounded font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm">
               <i class="ri-arrow-left-line"></i> Seguir Comprando
            </button>

            <button (click)="clearCart()" 
                    class="w-full text-red-500 hover:text-red-700 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2">
               <i class="ri-delete-bin-line"></i> Vaciar Carrito
            </button>
          </div>
        </div>

      </div>

      <!-- Clear Cart Confirmation Modal -->
      <div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50" *ngIf="showClearModal" (click)="closeClearModal()">
        <div class="bg-white rounded-lg shadow-xl p-6 w-80 max-w-full mx-4 transform transition-all animate-fadeIn" (click)="$event.stopPropagation()">
            <div class="text-center mb-5">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                    <i class="ri-delete-bin-line text-xl"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800">¿Vaciar Carrito?</h3>
                <p class="text-sm text-gray-500 mt-2">¿Estás seguro de que deseas eliminar todos los productos?</p>
            </div>
            <div class="flex gap-3">
                <button (click)="closeClearModal()" 
                        class="flex-1 px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Cancelar
                </button>
                <button (click)="confirmClear()" 
                        class="flex-1 px-4 py-2 bg-red-500 text-white rounded font-medium hover:bg-red-600 transition-colors shadow-sm">
                    Sí, Vaciar
                </button>
            </div>
        </div>
      </div>

    </div>
  `,
  styles: []
})
export class CartSidebarComponent {
  private uiService = inject(UiService);
  public cartService = inject(CartService);
  private router = inject(Router);

  isOpen = toSignal(this.uiService.isCartOpen$, { initialValue: false });
  showClearModal = false;

  close() {
    this.uiService.closeCart();
  }

  updateQty(itemId: string, newQty: number) {
    this.cartService.updateQuantity(itemId, newQty);
  }

  goToCheckout() {
    this.close();
    this.router.navigate(['/cart']);
  }

  continueShopping() {
    this.close();
    this.router.navigate(['/products']);
  }

  clearCart() {
    this.showClearModal = true;
  }

  closeClearModal() {
    this.showClearModal = false;
  }

  confirmClear() {
    this.cartService.clearCart();
    this.showClearModal = false;
  }
}
