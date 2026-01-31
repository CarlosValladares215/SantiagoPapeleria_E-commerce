import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
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
    @Output() closeFilters = new EventEmitter<void>();

    // Estado del drawer móvil
    isDrawerOpen = signal<boolean>(false);

    priceRanges = [
        { min: 0, max: 1000, label: 'Todos los precios' },
        { min: 0, max: 5, label: 'Menos de $5' },
        { min: 5, max: 15, label: '$5 - $15' },
        { min: 15, max: 100, label: '$15 - $100' },
        { min: 100, max: 1000, label: 'Más de $100' }
    ];

    openDrawer(): void {
        this.isDrawerOpen.set(true);
        document.body.style.overflow = 'hidden';
    }

    closeDrawer(): void {
        this.isDrawerOpen.set(false);
        document.body.style.overflow = '';
        this.closeFilters.emit();
    }

    onCategorySelect(category: string): void {
        this.filterChange.emit({ key: 'category', value: category });
    }

    onPriceRangeSelect(min: number, max: number): void {
        this.filterChange.emit({ key: 'priceRange', value: [min, max] });
    }

    onSliderChange(value: string): void {
        const max = parseInt(value, 10);
        this.filterChange.emit({ key: 'priceRange', value: [0, max] });
    }

    onStockToggle(checked: boolean): void {
        this.filterChange.emit({ key: 'inStock', value: checked });
    }

    onClearFilters(): void {
        this.clearFilters.emit();
    }

    onApplyFilters(): void {
        this.closeDrawer();
    }

    isPriceRangeActive(min: number, max: number): boolean {
        return this.filters.priceRange[0] === min && this.filters.priceRange[1] === max;
    }

    getCategoryLabel(name: string): string {
        return name || 'Todos los Productos';
    }

    // Contar filtros activos
    getActiveFiltersCount(): number {
        let count = 0;
        if (this.filters.category) count++;
        if (this.filters.inStock) count++;
        if (this.filters.priceRange[1] < 1000) count++;
        return count;
    }
}
