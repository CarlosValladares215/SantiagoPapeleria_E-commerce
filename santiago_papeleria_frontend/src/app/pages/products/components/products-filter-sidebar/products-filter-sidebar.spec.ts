import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductsFilterSidebar } from './products-filter-sidebar';
import { FilterState } from '../../../../models/filter.model';

describe('ProductsFilterSidebar', () => {
    let component: ProductsFilterSidebar;
    let fixture: ComponentFixture<ProductsFilterSidebar>;

    const mockFilters: FilterState = {
        category: '',
        brand: '',
        priceRange: [0, 100],
        inStock: false,
        sortBy: 'name',
        searchTerm: ''
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ProductsFilterSidebar]
        }).compileComponents();

        fixture = TestBed.createComponent(ProductsFilterSidebar);
        component = fixture.componentInstance;
        component.filters = mockFilters;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit filterChange on category select', () => {
        spyOn(component.filterChange, 'emit');
        component.onCategorySelect('Útiles Escolares');
        expect(component.filterChange.emit).toHaveBeenCalledWith({
            key: 'category',
            value: 'Útiles Escolares'
        });
    });
});
