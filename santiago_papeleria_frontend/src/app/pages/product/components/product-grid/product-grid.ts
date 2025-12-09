import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProductGrid {
  id: number;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  stock: number;
  category: string;
  isNew: boolean;
  isOffer?: boolean;
  rating?: number;
  reviews?: number;
}

@Component({
  selector: 'app-product-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-gallery.html',
  styleUrls: ['./product-gallery.scss'],
})
export class ProductGrid {
  @Input() products: ProductGrid[] = [];
}
