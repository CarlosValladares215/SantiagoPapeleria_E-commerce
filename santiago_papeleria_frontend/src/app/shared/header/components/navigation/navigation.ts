import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
})
export class Navigation {
  @Input() groupedCategories: any[] = [];
  @Input() activeMenu: string = 'none';

  @Output() openMega = new EventEmitter<string>();
  @Output() closeMega = new EventEmitter<void>();

  onMouseEnter(menuName: string) {
    this.openMega.emit(menuName);
  }

  onMouseLeave() {
    this.closeMega.emit();
  }
}
