import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductsPagination } from './products-pagination';

describe('ProductsPagination', () => {
    let component: ProductsPagination;
    let fixture: ComponentFixture<ProductsPagination>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ProductsPagination]
        }).compileComponents();

        fixture = TestBed.createComponent(ProductsPagination);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit pageChange event', () => {
        spyOn(component.pageChange, 'emit');
        component.onPageClick(2);
        expect(component.pageChange.emit).toHaveBeenCalledWith(2);
    });

    it('should calculate page numbers correctly', () => {
        component.totalPages = 10;
        component.currentPage = 5;
        const pages = component.getPageNumbers();
        expect(pages.length).toBeGreaterThan(0);
    });
});
