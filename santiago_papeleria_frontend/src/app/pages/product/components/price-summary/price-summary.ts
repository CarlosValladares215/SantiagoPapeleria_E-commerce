import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-price-summary',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './price-summary.html',
    styleUrls: ['./price-summary.scss']
})
export class PriceSummary {
    @Input() currentPrice: number = 0;
    @Input() quantity: number = 1;
    @Input() totalPrice: number = 0;
    @Input() savings: number = 0;
}
