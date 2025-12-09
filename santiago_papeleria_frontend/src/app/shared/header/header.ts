import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    FormsModule
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class Header {

  isMobileMenuOpen = signal(false);
  isProfileMenuOpen = signal(false);
  isCategoriesOpen = signal(false);

  megaMenu = signal<'none' | 'bazar' | 'papeleria'>('none');
  private megaHideTimeout: any;

  searchQuery: string = '';
  cartCount: number = 3;

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
    private router: Router
  ) {}

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

  openMega(menu: 'bazar' | 'papeleria') {
    if (window.innerWidth <= 992) return;
    clearTimeout(this.megaHideTimeout);
    this.megaMenu.set(menu);
  }

  scheduleCloseMega() {
    if (window.innerWidth <= 992) return;
    this.megaHideTimeout = setTimeout(() => {
      this.megaMenu.set('none');
    }, 250);
  }

  cancelCloseMega() {
    if (window.innerWidth <= 992) return;
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