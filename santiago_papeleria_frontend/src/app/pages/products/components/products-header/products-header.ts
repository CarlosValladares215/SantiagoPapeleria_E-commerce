import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SortOption } from '../../../../models/filter.model';

@Component({
    selector: 'app-products-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './products-header.html',
    styleUrls: ['./products-header.scss']
})
export class ProductsHeader {
    @Input() productCount: number = 0;
    @Input() currentSort: string = 'name';
    @Input() showMobileFilters: boolean = false;

    @Output() sortChange = new EventEmitter<string>();
    @Output() toggleFilters = new EventEmitter<void>();

    showSortDropdown: boolean = false;

    sortOptions: SortOption[] = [
        { value: 'name', label: 'Ordenar por Nombre', icon: 'ri-sort-alphabet-asc' },
        { value: 'price', label: 'Precio: Menor a Mayor', icon: 'ri-arrow-up-line' },
        { value: '-price', label: 'Precio: Mayor a Menor', icon: 'ri-arrow-down-line' },
        { value: 'newest', label: 'Más Nuevos', icon: 'ri-time-line' }
    ];

    get currentSortOption(): SortOption {
        return this.sortOptions.find(opt => opt.value === this.currentSort) || this.sortOptions[0];
    }

    onSortSelect(value: string): void {
        this.sortChange.emit(value);
        this.showSortDropdown = false;
    }

    toggleSortDropdown(): void {
        this.showSortDropdown = !this.showSortDropdown;
    }

    closeSortDropdown(): void {
        this.showSortDropdown = false;
    }

    onToggleFilters(): void {
        this.toggleFilters.emit();
    }
}
