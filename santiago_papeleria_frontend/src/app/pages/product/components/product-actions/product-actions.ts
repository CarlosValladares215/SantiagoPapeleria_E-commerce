import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
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
export class ProductActions implements OnChanges {

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

  // Helper to ensure Stock is always a number > 0
  get hasStock(): boolean {
    const s = Number(this.stock);
    return !isNaN(s) && s > 0;
  }

  increaseQuantity() {
    if (this.hasStock && this.quantity < this.stock) {
      this.quantityChange.emit(this.quantity + 1);
    }
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantityChange.emit(this.quantity - 1);
    }
  }

  // Handle dynamic input changes (e.g. Variant switch changes stock)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stock']) {
      const newStock = Number(changes['stock'].currentValue);
      // Auto-clamp if stock dropped below current quantity
      // Only if stock is valid (> 0) but less than quantity.
      // If stock becomes 0, hasStock becomes false, buttons disable, so explicit clamp to 0 isn't confusing.
      // But we should clamp to newStock if stock > 0.
      if (!isNaN(newStock) && newStock > 0 && this.quantity > newStock) {
        this.quantityChange.emit(newStock);
      }
    }
  }

  // Handle manual input in the numeric field
  onQuantityInput(target: EventTarget | null) {
    const inputEl = target as HTMLInputElement;
    let value = Number(inputEl.value);

    // 1. Handle NaN or Garbage -> Reset to 1 (or Min)
    if (isNaN(value)) {
      this.quantityChange.emit(1);
      inputEl.value = '1';
      return;
    }

    // 2. Force Integer
    value = Math.floor(value);

    // 3. Clamp Logic
    const currentStock = Number(this.stock);
    const safeStock = isNaN(currentStock) ? 0 : currentStock;

    if (value < 1) {
      this.quantityChange.emit(1);
      inputEl.value = '1'; // Force DOM update
    } else if (safeStock > 0 && value > safeStock) {
      this.quantityChange.emit(safeStock);
      inputEl.value = safeStock.toString(); // Force DOM update
    } else {
      // Valid value
      this.quantityChange.emit(value);
      // If value was float and we floored it, update DOM
      if (Number(inputEl.value) !== value) {
        inputEl.value = value.toString();
      }
    }
  }

  // Prevent non-numeric key presses
  preventNonNumeric(event: KeyboardEvent): void {
    // Allowed keys: Backspace, Tab, End, Home, Delete, Arrows, Enter
    const allowedKeys = [46, 8, 9, 27, 13, 110];
    const isControlKey = (event.keyCode === 65 || event.keyCode === 67 || event.keyCode === 86 || event.keyCode === 88) && (event.ctrlKey || event.metaKey);
    const isNavKey = event.keyCode >= 35 && event.keyCode <= 39;

    if (allowedKeys.indexOf(event.keyCode) !== -1 || isControlKey || isNavKey) {
      return;
    }

    // Block non-numeric
    if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) && (event.keyCode < 96 || event.keyCode > 105)) {
      event.preventDefault();
    }
  }

  onMessageChange(message: string) {
    this.customMessageChange.emit(message);
  }

  handleAddToCart() {
    if (!this.hasStock) {
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

  handleBuyNow() {
    if (!this.hasStock) {
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