import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../services/cart/cart.service';
import { UiService } from '../../../services/ui/ui.service';

@Component({
  selector: 'app-floating-cart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button 
      class="floating-cart-btn" 
      [class.has-items]="cartService.cartCount() > 0"
      (click)="toggleCart()"
      aria-label="Ver carrito"
    >
      <div class="cart-icon-wrapper">
        <i class="fas fa-shopping-cart"></i>
        <span *ngIf="cartService.cartCount() > 0" class="cart-badge">
          {{ cartService.cartCount() }}
        </span>
      </div>
      <span class="cart-text">CARRITO</span>
    </button>
  `,
  styles: [`
    .floating-cart-btn {
      position: fixed;
      right: 0;
      top: 160px; /* Just below header */
      z-index: 1000;
      background-color: #104d73;
      color: white;
      border: none;
      border-top-left-radius: 8px;
      border-bottom-left-radius: 8px;
      padding: 15px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      overflow: hidden;
    }

    .floating-cart-btn:hover {
      background-color: #012e40;
      padding-right: 20px;
      transform: translateX(-5px);
      box-shadow: -4px 0 15px rgba(0, 0, 0, 0.2);
    }

    .cart-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }

    .cart-badge {
      position: absolute;
      top: -10px;
      right: -10px;
      background-color: #ff0000;
      color: white;
      font-size: 11px;
      font-weight: bold;
      height: 20px;
      min-width: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2px solid #104d73;
    }

    .floating-cart-btn:hover .cart-badge {
      border-color: #012e40;
    }

    .cart-text {
      font-weight: 800;
      font-size: 0.7rem;
      letter-spacing: 1px;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      line-height: 1;
    }

    /* Mobile adjustments */
    @media (max-width: 768px) {
      .floating-cart-btn {
        top: 140px; /* Adjust for mobile header if needed */
        padding: 12px 10px;
      }
      
      .cart-text {
        font-size: 0.6rem;
      }
    }
  `]
})
export class FloatingCartComponent {
  public cartService = inject(CartService);
  private uiService = inject(UiService);

  toggleCart() {
    this.uiService.toggleCart();
  }
}
