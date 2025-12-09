import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../models/product.model';


@Component({
  selector: 'app-product-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-info.html',
  styleUrls: ['./product-info.scss'],
})
export class ProductInfo {

  @Input() product!: Product;

  get stockStatus(): 'in' | 'low' | 'out' {
    if (this.product.stock === 0) return 'out';
    if (this.product.stock > 0 && this.product.stock < 10) return 'low';
    return 'in';
  }

  get stockText(): string {
    if (this.product.stock === 0) return 'Agotado';
    if (this.product.stock < 10) return `Solo ${this.product.stock} disponibles`;
    return 'En stock';
  }

  get safeDescription(): string {
    return (
      this.product.description ||
      'Este producto es parte de nuestro catálogo oficial. Detalles adicionales próximamente.'
    );
  }
}
