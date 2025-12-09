import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf, NgFor } from '@angular/common';
import { RouterLink } from '@angular/router';

// Interfaz para el ítem del carrito
interface CartItem {
  id: number;
  name: string;
  variant: string;
  quantity: number;
  price: number;
  customMessage: string;
}

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, NgIf, NgFor, RouterLink], 
  templateUrl: './order-summary.html',
  styleUrl: './order-summary.scss',
})
export class OrderSummary {
  // === INPUTS ===
  // Recibe la lista de ítems (ESTE ES EL QUE FALTABA Y CAUSABA EL ERROR NG8002)
  @Input({ required: true }) cartItems: CartItem[] = [];

  // === OUTPUTS ===
  
  // Emite un objeto específico, resolviendo el error TS2345 en el HTML
  @Output() quantityChange = new EventEmitter<{ itemId: number, newQuantity: number }>();

  // Emite un número, resolviendo el error TS2345 en el HTML
  @Output() removeItem = new EventEmitter<number>();

  // === MÉTODOS ===

  handleChangeQuantity(itemId: number, currentQuantity: number, delta: number): void {
    const newQuantity = currentQuantity + delta;
    // Esto asegura que el evento emitido coincida con el tipo esperado en el padre
    this.quantityChange.emit({ itemId, newQuantity });
  }

  handleRemoveItem(itemId: number): void {
    this.removeItem.emit(itemId);
  }
}