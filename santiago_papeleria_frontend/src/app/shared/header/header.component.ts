import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { MegaMenuComponent } from './mega-menu/mega-menu.component';
import { MobileMenuComponent } from './mobile-menu/mobile-menu.component';
// import { CartSidebarComponent } from './cart-sidebar/cart-sidebar.component';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    ReactiveFormsModule,
    MegaMenuComponent,
    MobileMenuComponent,
    // CartSidebarComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class Header {

  // Dependencies
  private uiService = inject(UiService);
  public auth = inject(AuthService);
  private router = inject(Router);

  // Signals synced with UiService for template usage if needed, or simply for logic
  // We can convert the observable to a signal for easier usage in template [class.hidden]="!isMobileMenuOpen()"
  isMobileMenuOpen = toSignal(this.uiService.isMobileMenuOpen$, { initialValue: false });
  isCartOpen = toSignal(this.uiService.isCartOpen$, { initialValue: false });

  // Missing properties from template
  isHidden = false;
  isScrolled = false;
  searchControl = new FormControl('');
  showSuggestions = false;
  searchSuggestions$: Observable<any[]> = of([]);
  // searchSuggestions$ = of([]); // Need RxJS import

  // Local state
  isProfileMenuOpen = signal(false);
  isCategoriesOpen = signal(false);

  private megaHideTimeout: any;

  searchQuery: string = '';
  cartCount: number = 3;
  // cartItemCount$ property to match template
  cartItemCount$ = this.uiService.cartItemCount$;

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled = window.scrollY > 0;
  }

  onSearchFocus() {
    this.showSuggestions = true;
  }

  onSearchBlur() {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  // CATEGORÍAS
  categories = [
    { name: 'Bazar', path: '/bazar', icon: 'ri-shopping-bag-line', count: 245 },
    { name: 'Papelería', path: '/papeleria', icon: 'ri-pencil-line', count: 189 },
    { name: 'Oficina', path: '/oficina', icon: 'ri-briefcase-line', count: 156 },
    { name: 'Promociones', path: '/offers', icon: 'ri-price-tag-3-line', count: 42 },
    { name: 'Contacto', path: '/contact', icon: 'ri-mail-line', count: 0 }
  ];

  constructor() { }

  toggleMobileMenu() {
    this.uiService.toggleMobileMenu();
    // When toggling, if we are opening, maybe we want to close other things?
    // The service handles body overflow.
    if (!this.isMobileMenuOpen()) {
      this.uiService.setActiveMegaMenu(null);
    }
  }

  closeMobileMenu() {
    this.uiService.closeMobileMenu();
    this.uiService.setActiveMegaMenu(null);
  }

  toggleCart() {
    this.uiService.toggleCart();
  }

  onNavLinkClick() {
    this.closeMobileMenu();
    this.closeProfileMenu();
    this.closeCategories();
  }

  toggleCategories() {
    this.isCategoriesOpen.update(v => !v);
  }

  closeCategories() {
    this.isCategoriesOpen.set(false);
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen.update(v => !v);
  }

  closeProfileMenu() {
    this.isProfileMenuOpen.set(false);
  }

  logout() {
    this.auth.logout();
    this.closeProfileMenu();
    this.closeMobileMenu();
    this.router.navigate(['/']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
    this.closeMobileMenu();
  }

  onMegaMenuEnter(menuId: string) {
    if (window.innerWidth <= 992) return;
    clearTimeout(this.megaHideTimeout);
    this.uiService.setActiveMegaMenu(menuId);
  }

  onMegaMenuHover() {
    clearTimeout(this.megaHideTimeout);
  }

  onMegaMenuLeave() {
    if (window.innerWidth <= 992) return;
    this.megaHideTimeout = setTimeout(() => {
      this.uiService.setActiveMegaMenu(null);
    }, 250);
  }

  performSearch() {
    const q = this.searchQuery.trim();
    if (!q) return;

    this.router.navigate(['/products'], {
      queryParams: { search: q }
    });

    this.closeMobileMenu();
  }
}