import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductsHeader } from './products-header';

describe('ProductsHeader', () => {
    let component: ProductsHeader;
    let fixture: ComponentFixture<ProductsHeader>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ProductsHeader]
        }).compileComponents();

        fixture = TestBed.createComponent(ProductsHeader);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit sortChange event', () => {
        spyOn(component.sortChange, 'emit');
        component.onSortSelect('price-low');
        expect(component.sortChange.emit).toHaveBeenCalledWith('price-low');
    });

    it('should toggle sort dropdown', () => {
        expect(component.showSortDropdown).toBe(false);
        component.toggleSortDropdown();
        expect(component.showSortDropdown).toBe(true);
    });
});
