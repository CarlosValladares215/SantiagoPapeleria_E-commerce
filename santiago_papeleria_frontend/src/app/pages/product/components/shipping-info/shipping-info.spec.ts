import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShippingInfo } from './shipping-info';

describe('ShippingInfo', () => {
    let component: ShippingInfo;
    let fixture: ComponentFixture<ShippingInfo>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ShippingInfo]
        }).compileComponents();

        fixture = TestBed.createComponent(ShippingInfo);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have 3 shipping methods', () => {
        expect(component.shippingMethods.length).toBe(3);
    });

    it('should have 4 payment methods', () => {
        expect(component.paymentMethods.length).toBe(4);
    });
});
