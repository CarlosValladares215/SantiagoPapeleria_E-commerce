import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { UiService } from '../../services/ui/ui.service';
import { CartService } from '../../services/cart/cart.service';
import { NotificationsService } from '../../services/notifications/notifications.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class Header {

  isProfileMenuOpen = signal(false);
  isNotificationsOpen = signal(false); // New signal for notifications dropdown
  megaMenu = signal<'none' | 'papeleria' | 'hogar' | 'creatividad'>('none');
  private megaHideTimeout: any;
  searchQuery: string = '';

  constructor(
    public auth: AuthService,
    private router: Router,
    public uiService: UiService,
    public cartService: CartService,
    public notificationsService: NotificationsService // Inject
  ) { }

  toggleCart() {
    this.uiService.toggleCart();
    this.isNotificationsOpen.set(false); // Close notifications if cart opens
  }

  toggleNotifications() {
    this.isNotificationsOpen.update(v => !v);
    this.isProfileMenuOpen.set(false); // Close profile if notifications open
  }

  closeNotifications() {
    this.isNotificationsOpen.set(false);
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen.update(v => !v);
  }

  closeProfileMenu() {
    this.isProfileMenuOpen.set(false);
  }

  isProfileMenuOpenValue() {
    return this.isProfileMenuOpen();
  }

  logout() {
    this.auth.logout();
    this.closeProfileMenu();
    this.router.navigate(['/']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  openMega(menu: 'papeleria' | 'hogar' | 'creatividad') {
    clearTimeout(this.megaHideTimeout);
    this.megaMenu.set(menu);
  }

  scheduleCloseMega() {
    this.megaHideTimeout = setTimeout(() => {
      this.megaMenu.set('none');
    }, 250);
  }

  cancelCloseMega() {
    clearTimeout(this.megaHideTimeout);
  }

  performSearch() {
    const q = this.searchQuery.trim();
    if (!q) return;

    this.router.navigate(['/products'], {
      queryParams: { search: q }
    });
  }

  getInitials(name: string): string {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 0) return '';
    return names[0].charAt(0).toUpperCase();
  }
}