import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductCard } from './product-card';
import { Product } from '../../../../models/product.model';

describe('ProductCard', () => {
    let component: ProductCard;
    let fixture: ComponentFixture<ProductCard>;

    const mockProduct: Product = {
        _id: '1',
        internal_id: '001',
        name: 'Test Product',
        brand: 'Test Brand',
        category: 'Test Category',
        price: 10.00,
        isOffer: false,
        vat_included: true,
        stock: 50,
        images: ['test.jpg'],
        isNew: false,
        specs: [],
        reviews: []
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ProductCard]
        }).compileComponents();

        fixture = TestBed.createComponent(ProductCard);
        component = fixture.componentInstance;
        component.product = mockProduct;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit viewDetails event', () => {
        spyOn(component.viewDetails, 'emit');
        component.onViewDetails();
        expect(component.viewDetails.emit).toHaveBeenCalled();
    });

    it('should emit addToCart event when stock available', () => {
        spyOn(component.addToCart, 'emit');
        component.onAddToCart();
        expect(component.addToCart.emit).toHaveBeenCalledWith({
            id: '1',
            name: 'Test Product'
        });
    });
});
