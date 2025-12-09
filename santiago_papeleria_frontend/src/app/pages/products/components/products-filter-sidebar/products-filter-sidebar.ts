import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterState, CategoryCount } from '../../../../models/filter.model';

@Component({
    selector: 'app-products-filter-sidebar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './products-filter-sidebar.html',
    styleUrls: ['./products-filter-sidebar.scss']
})
export class ProductsFilterSidebar {
    @Input() filters!: FilterState;
    @Input() showFilters: boolean = false;
    @Input() categories: CategoryCount[] = [];

    @Output() filterChange = new EventEmitter<{ key: keyof FilterState, value: any }>();
    @Output() clearFilters = new EventEmitter<void>();

    priceRanges = [
        { min: 0, max: 100, label: 'Todos los precios' },
        { min: 0, max: 5, label: 'Menos de $5' },
        { min: 5, max: 15, label: '$5 - $15' },
        { min: 15, max: 100, label: 'Más de $15' }
    ];

    onCategorySelect(category: string): void {
        this.filterChange.emit({ key: 'category', value: category });
    }

    onPriceRangeSelect(min: number, max: number): void {
        this.filterChange.emit({ key: 'priceRange', value: [min, max] });
    }

    onStockToggle(checked: boolean): void {
        this.filterChange.emit({ key: 'inStock', value: checked });
    }

    onClearFilters(): void {
        this.clearFilters.emit();
    }

    isPriceRangeActive(min: number, max: number): boolean {
        return this.filters.priceRange[0] === min && this.filters.priceRange[1] === max;
    }

    getCategoryLabel(name: string): string {
        return name || 'Todos los Productos';
    }
}
