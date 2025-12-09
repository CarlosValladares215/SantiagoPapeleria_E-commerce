import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FiltersService } from '../../services/filters.service';

@Component({
  selector: 'app-filters-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filters-panel.html',
  styleUrls: ['./filters-panel.scss']
})
export class FiltersPanelComponent {

  @Output() filtersChanged = new EventEmitter<void>();

  constructor(public filters: FiltersService) {}

  /** CATEGORY */
  setCategory(cat: string) {
    this.filters.setCategory(cat);
    this.filtersChanged.emit();
  }

  /** PRICE RANGE */
  setPrice(min: number, max: number) {
    this.filters.setPriceRange(min, max);
    this.filtersChanged.emit();
  }

  /** IN STOCK */
  toggleStock() {
    const current = this.filters.current();
    this.filters.setInStock(!current.inStock);
    this.filtersChanged.emit();
  }

  /** RESET ALL */
  clearFilters() {
    this.filters.resetFilters();
    this.filtersChanged.emit();
  }
}
