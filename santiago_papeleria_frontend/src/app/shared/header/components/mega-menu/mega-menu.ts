import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SuperCategoryGroup } from '../../../../models/category.model';

@Component({
  selector: 'app-mega-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mega-menu.html',
  styleUrl: './mega-menu.scss',
})
export class MegaMenu {
  @Input() groupedCategories: SuperCategoryGroup[] = [];
  @Input() activeMenu: string = 'none';

  @Output() cancelClose = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  readonly VISIBLE_ITEMS_LIMIT = 6;

  onMouseEnter() {
    this.cancelClose.emit();
  }

  onMouseLeave() {
    this.close.emit();
  }
}
