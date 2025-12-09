import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProductSpec {
  label: string;
  value: string;
}

@Component({
  selector: 'app-product-specs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-specs.html',
  styleUrls: ['./product-specs.scss'],
})
export class ProductSpecs {
  @Input() specs: ProductSpec[] = [];
}
