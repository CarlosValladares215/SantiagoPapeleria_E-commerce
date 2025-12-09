import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductVariants } from './product-variants';

describe('ProductVariants', () => {
    let component: ProductVariants;
    let fixture: ComponentFixture<ProductVariants>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ProductVariants]
        }).compileComponents();

        fixture = TestBed.createComponent(ProductVariants);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit colorSelect event when color is clicked', () => {
        spyOn(component.colorSelect, 'emit');
        component.selectColor('azul');
        expect(component.colorSelect.emit).toHaveBeenCalledWith('azul');
    });

    it('should emit sizeSelect event when size is clicked', () => {
        spyOn(component.sizeSelect, 'emit');
        component.selectSize('A4');
        expect(component.sizeSelect.emit).toHaveBeenCalledWith('A4');
    });
});
