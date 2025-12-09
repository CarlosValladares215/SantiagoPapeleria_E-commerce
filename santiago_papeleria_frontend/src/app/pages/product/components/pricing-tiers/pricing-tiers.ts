import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PriceTier } from '../../../../models/product.model';

@Component({
    selector: 'app-pricing-tiers',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pricing-tiers.html',
    styleUrls: ['./pricing-tiers.scss']
})
export class PricingTiers {
    @Input() basePrice: number = 0;
    @Input() tiers: PriceTier[] = [];
    @Input() quantity: number = 1;
    @Input() sizeMultiplier: number = 1;
    @Input() stock: number = 0;

    @Output() selectTier = new EventEmitter<number>();

    getTierPrice(tier: PriceTier): number {
        return this.basePrice * this.sizeMultiplier * (1 - tier.discount);
    }

    isTierActive(tier: PriceTier): boolean {
        return this.quantity >= tier.min && this.quantity <= tier.max;
    }

    isTierDisabled(tier: PriceTier): boolean {
        return tier.min > this.stock;
    }

    select(tier: PriceTier): void {
        if (!this.isTierDisabled(tier)) {
            this.selectTier.emit(tier.min);
        }
    }

    getSavings(tier: PriceTier): number {
        const originalPrice = this.basePrice * this.sizeMultiplier;
        const tierPrice = this.getTierPrice(tier);
        return originalPrice - tierPrice;
    }

    getSavingsPercentage(tier: PriceTier): number {
        return Math.round(tier.discount * 100);
    }
}
