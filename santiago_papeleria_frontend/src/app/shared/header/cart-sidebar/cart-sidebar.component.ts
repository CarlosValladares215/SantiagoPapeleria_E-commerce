import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../../services/ui.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-cart-sidebar',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 z-50 bg-black/50" *ngIf="isOpen()" (click)="close()">
      <div class="absolute right-0 top-0 bg-white w-80 h-full p-4" (click)="$event.stopPropagation()">
        <h2>Cart</h2>
        <!-- Content here -->
      </div>
    </div>
  `,
    styles: []
})
export class CartSidebarComponent {
    private uiService = inject(UiService);
    isOpen = toSignal(this.uiService.isCartOpen$, { initialValue: false });

    close() {
        this.uiService.toggleCart();
    }
}
