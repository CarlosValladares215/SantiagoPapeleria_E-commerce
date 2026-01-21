import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

// Services
// Services
import { ProductService } from '../../services/product/product.service';
import { SuperCategoryGroup } from '../../models/category.model';

// Components
import { TopBar } from './components/top-bar/top-bar';
import { SearchBar } from './components/search-bar/search-bar';
import { UserActions } from './components/user-actions/user-actions';
import { Navigation } from './components/navigation/navigation';
import { MegaMenu } from './components/mega-menu/mega-menu';
import { MobileMenuComponent } from './mobile-menu/mobile-menu.component'; // Ensure correct import

import { UiService } from '../../services/ui/ui.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TopBar,
    SearchBar,
    UserActions,
    Navigation,
    MegaMenu,
    MobileMenuComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class Header implements OnInit {
  private productService = inject(ProductService);
  public uiService = inject(UiService);

  megaMenu = signal<string>('none');
  groupedCategories = signal<SuperCategoryGroup[]>([]);
  private megaHideTimeout: any;
  private megaShowTimeout: any;
  private readonly HOVER_DELAY = 250;
  private readonly CLOSE_DELAY = 200;

  ngOnInit() {
    this.productService.fetchCategoriesStructure().subscribe(grouped => {
      this.groupedCategories.set(grouped);
    });
  }

  openMega(menu: string) {
    // 1. Cancelar cualquier cierre pendiente (si venimos del contenido o de otro menú)
    clearTimeout(this.megaHideTimeout);

    // 2. Si ya estamos en el mismo menú, no hacemos nada
    if (this.megaMenu() === menu) return;

    // 3. Cancelar apertura pendiente de otro menú (si movió el mouse rápido de A a B)
    clearTimeout(this.megaShowTimeout);

    // 4. Programar apertura (Hover Intent)
    // Si ya hay un menú abierto, el cambio es inmediato (UX: exploración fluida)
    const delay = this.megaMenu() !== 'none' ? 0 : this.HOVER_DELAY;

    this.megaShowTimeout = setTimeout(() => {
      this.megaMenu.set(menu);
    }, delay);
  }

  scheduleCloseMega() {
    // 1. Si el usuario saca el mouse antes de que se abra, cancelamos la apertura
    clearTimeout(this.megaShowTimeout);

    // 2. Programar cierre con "delay decente"
    this.megaHideTimeout = setTimeout(() => {
      this.megaMenu.set('none');
    }, this.CLOSE_DELAY);
  }

  cancelCloseMega() {
    // El usuario entró al área del menú o regresó al trigger
    clearTimeout(this.megaHideTimeout);
    clearTimeout(this.megaShowTimeout); // (Opcional) Si entra al contenido, ya está abierto
  }
}