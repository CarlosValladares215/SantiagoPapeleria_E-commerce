import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductPrice } from '../product-price/product-price';

export interface RelatedProduct {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  isOffer: boolean;
  isNew: boolean;
  image: string;
  stock: number;
  category: string;
}

@Component({
  selector: 'app-product-related',
  standalone: true,
  imports: [CommonModule, ProductPrice],
  templateUrl: './product-related.html',
  styleUrls: ['./product-related.scss'],
})
export class ProductRelated {
  @Input() related: RelatedProduct[] = [];
  @Input() products: any[] = [];
}
