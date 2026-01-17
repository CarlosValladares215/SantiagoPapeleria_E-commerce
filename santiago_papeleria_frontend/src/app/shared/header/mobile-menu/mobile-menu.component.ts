import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UiService } from '../../../services/ui/ui.service';
import { AuthService } from '../../../services/auth/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { SuperCategoryGroup } from '../../../models/category.model';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
})
export class MobileMenuComponent {
  private uiService = inject(UiService);
  public auth = inject(AuthService);
  private router = inject(Router);

  @Input() groupedCategories: SuperCategoryGroup[] = [];

  isOpen = toSignal(this.uiService.isMobileMenuOpen$, { initialValue: false });
  expandedGroup = signal<string | null>(null);

  close() {
    this.uiService.closeMobileMenu();
  }

  toggleGroup(groupName: string) {
    if (this.expandedGroup() === groupName) {
      this.expandedGroup.set(null);
    } else {
      this.expandedGroup.set(groupName);
    }
  }

  logout() {
    this.auth.logout();
    this.close();
    this.router.navigate(['/']);
  }

  getInitials(name: string): string {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 0) return '';
    return names[0].charAt(0).toUpperCase();
  }
}
