import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../../services/ui.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-mobile-menu',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 z-50 bg-black/50" *ngIf="isOpen()" (click)="close()">
      <div class="bg-white w-64 h-full p-4" (click)="$event.stopPropagation()">
        <h2>Menu</h2>
        <!-- Content here -->
      </div>
    </div>
  `,
    styles: []
})
export class MobileMenuComponent {
    private uiService = inject(UiService);
    isOpen = toSignal(this.uiService.isMobileMenuOpen$, { initialValue: false });

    close() {
        this.uiService.closeMobileMenu();
    }
}
