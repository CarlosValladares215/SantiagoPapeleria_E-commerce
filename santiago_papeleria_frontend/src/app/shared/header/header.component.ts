import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { UiService } from '../../services/ui/ui.service';
import { CartService } from '../../services/cart/cart.service';
import { NotificationsService } from '../../services/notifications/notifications.service';
import { ProductService } from '../../services/product/product.service';

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
  megaMenu = signal<string>('none');
  categories = signal<any[]>([]);
  private megaHideTimeout: any;
  searchQuery: string = '';

  constructor(
    public auth: AuthService,
    private router: Router,
    public uiService: UiService,
    public cartService: CartService,
    public notificationsService: NotificationsService,
    private productService: ProductService
  ) { }

  ngOnInit() {
    this.productService.fetchCategoriesStructure().subscribe(cats => {
      // Add icons manually if not present
      const enriched = cats.map(c => ({
        ...c,
        icono: this.getCategoryIcon(c.nombre)
      }));
      this.categories.set(enriched);
    });
  }

  getCategoryIcon(name: string): string {
    const n = name.toUpperCase();
    if (n.includes('ESCOLAR')) return 'fa-graduation-cap';
    if (n.includes('OFICINA')) return 'fa-briefcase';
    if (n.includes('ELECTRONICA') || n.includes('TECNOLOGIA')) return 'fa-laptop';
    if (n.includes('HOGAR') || n.includes('DECORACION')) return 'fa-home';
    if (n.includes('PERSONAL') || n.includes('ASEO')) return 'fa-hand-holding-heart';
    if (n.includes('MODA') || n.includes('ACCESORIOS') || n.includes('CABELLO')) return 'fa-tshirt';
    if (n.includes('BISUTERIA') || n.includes('BOLSOS')) return 'fa-shopping-bag';
    if (n.includes('DEPORTE') || n.includes('GYM')) return 'fa-dumbbell';
    if (n.includes('ARTE') || n.includes('CREATIVIDAD') || n.includes('PAPELERIA ARTISTICA')) return 'fa-palette';
    if (n.includes('REGALO') || n.includes('FIESTA')) return 'fa-gift';
    if (n.includes('COMIDA') || n.includes('SNACK') || n.includes('DULCE')) return 'fa-cookie-bite';
    if (n.includes('JUGUETE')) return 'fa-gamepad';
    return 'fa-th-large';
  }

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

  openMega(menu: string) {
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