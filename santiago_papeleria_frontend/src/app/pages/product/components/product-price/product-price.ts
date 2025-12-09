import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProductPriceData {
  price: number;
  originalPrice?: number;
  discount?: number;
  isOffer: boolean;
}

@Component({
  selector: 'app-product-price',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-price.html',
  styleUrls: ['./product-price.scss'],
})
export class ProductPrice {
  @Input() price!: number;
  @Input() originalPrice?: number;
  @Input() discount?: number;
  @Input() isOffer: boolean = false;

  get hasDiscount(): boolean {
    return this.isOffer && !!this.originalPrice && !!this.discount;
  }
}
