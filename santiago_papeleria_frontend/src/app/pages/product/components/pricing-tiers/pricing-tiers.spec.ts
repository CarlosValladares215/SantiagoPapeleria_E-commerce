import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PricingTiers } from './pricing-tiers';

describe('PricingTiers', () => {
    let component: PricingTiers;
    let fixture: ComponentFixture<PricingTiers>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PricingTiers]
        }).compileComponents();

        fixture = TestBed.createComponent(PricingTiers);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should calculate tier price correctly', () => {
        component.basePrice = 100;
        component.sizeMultiplier = 1.1;
        const tier = { min: 50, max: 99, discount: 0.1, label: '50-99' };
        expect(component.getTierPrice(tier)).toBe(99); // 100 * 1.1 * 0.9
    });

    it('should identify active tier correctly', () => {
        component.quantity = 75;
        const tier = { min: 50, max: 99, discount: 0.1, label: '50-99' };
        expect(component.isTierActive(tier)).toBe(true);
    });
});
