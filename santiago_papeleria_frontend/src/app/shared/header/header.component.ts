import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { UiService } from '../../services/ui/ui.service';




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

  isMobileMenuOpen = signal(false);
  isProfileMenuOpen = signal(false);
  isCategoriesOpen = signal(false);

  megaMenu = signal<'none' | 'papeleria' | 'hogar' | 'creatividad'>('none');
  private megaHideTimeout: any;

  searchQuery: string = '';
  mobileCatOpen: string = ''; // Track open mobile category

  // CATEGORÍAS CON TODO LO QUE PIDE TU TEMPLATE
  categories = [
    {
      name: 'Bazar',
      path: '/bazar',
      icon: 'ri-shopping-bag-line',
      count: 245
    },
    {
      name: 'Papelería',
      path: '/papeleria',
      icon: 'ri-pencil-line',
      count: 189
    },
    {
      name: 'Oficina',
      path: '/oficina',
      icon: 'ri-briefcase-line',
      count: 156
    },
    {
      name: 'Promociones',
      path: '/offers',
      icon: 'ri-price-tag-3-line',
      count: 42
    },
    {
      name: 'Contacto',
      path: '/contact',
      icon: 'ri-mail-line',
      count: 0
    }
  ];

  constructor(
    public auth: AuthService,
    private router: Router,
    public uiService: UiService
  ) { }

  toggleCart() {
    this.uiService.toggleCart();
  }


  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
    if (!this.isMobileMenuOpen()) {
      this.megaMenu.set('none');
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
    this.megaMenu.set('none');
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

  isProfileMenuOpenValue() {
    return this.isProfileMenuOpen();
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

  openMega(menu: 'papeleria' | 'hogar' | 'creatividad') {
    if (typeof window !== 'undefined' && window.innerWidth <= 992) return;
    clearTimeout(this.megaHideTimeout);
    this.megaMenu.set(menu);
  }

  scheduleCloseMega() {
    if (typeof window !== 'undefined' && window.innerWidth <= 992) return;
    this.megaHideTimeout = setTimeout(() => {
      this.megaMenu.set('none');
    }, 250);
  }

  cancelCloseMega() {
    if (typeof window !== 'undefined' && window.innerWidth <= 992) return;
    clearTimeout(this.megaHideTimeout);
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