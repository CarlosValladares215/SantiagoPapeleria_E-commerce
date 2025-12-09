import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-stock',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-stock.html',
  styleUrls: ['./product-stock.scss'],
})
export class ProductStock {
  @Input() stock: number | null = null;
}
