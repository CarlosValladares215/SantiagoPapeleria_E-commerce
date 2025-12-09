import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../../models/product.model';

@Component({
  selector: 'app-product-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-actions.html',
  styleUrls: ['./product-actions.scss']
})
export class ProductActions {

  @Input() product!: Product;
  @Input() quantity: number = 1;
  @Input() customMessage: string = '';
  @Input() stock: number = 0;

  // Eventos para el padre
  @Output() quantityChange = new EventEmitter<number>();
  @Output() customMessageChange = new EventEmitter<string>();
  @Output() addToCart = new EventEmitter<{
    id: string;
    quantity: number;
    customMessage?: string;
  }>();
  @Output() buyNow = new EventEmitter<{
    id: string;
    quantity: number;
    customMessage?: string;
  }>();
  @Output() notify = new EventEmitter<string>();

  // Aumentar cantidad
  increase() {
    if (this.quantity < this.stock) {
      this.quantityChange.emit(this.quantity + 1);
    }
  }

  // Disminuir cantidad
  decrease() {
    if (this.quantity > 1) {
      this.quantityChange.emit(this.quantity - 1);
    }
  }

  // Cambio manual de cantidad
  onQuantityInput(value: number) {
    if (value >= 1 && value <= this.stock) {
      this.quantityChange.emit(value);
    }
  }

  // Cambio de mensaje personalizado
  onMessageChange(message: string) {
    this.customMessageChange.emit(message);
  }

  // Acción: Agregar al carrito
  handleAddToCart() {
    if (this.stock === 0) {
      this.notify.emit('Este producto está agotado');
      return;
    }

    this.addToCart.emit({
      id: this.product._id,
      quantity: this.quantity,
      customMessage: this.customMessage || undefined
    });

    this.notify.emit(`${this.product.name} agregado al carrito`);
  }

  // Acción: Comprar ahora
  handleBuyNow() {
    if (this.stock === 0) {
      this.notify.emit('Este producto está agotado');
      return;
    }

    this.buyNow.emit({
      id: this.product._id,
      quantity: this.quantity,
      customMessage: this.customMessage || undefined
    });
  }
}