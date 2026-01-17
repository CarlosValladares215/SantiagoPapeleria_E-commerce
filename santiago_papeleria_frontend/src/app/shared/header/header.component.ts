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

  ngOnInit() {
    this.productService.fetchCategoriesStructure().subscribe(grouped => {
      this.groupedCategories.set(grouped);
    });
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
}