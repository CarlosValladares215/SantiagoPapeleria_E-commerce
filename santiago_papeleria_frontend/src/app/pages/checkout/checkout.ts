import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common'; // Solo necesitamos CommonModule para las directivas básicas

// Interfaces
interface CartItem {
  id: number;
  name: string;
  variant: string;
  quantity: number;
  price: number;
  customMessage: string;
}

interface PaymentMethodInterface {
  id: string;
  name: string;
  description: string;
  icon: string;
  badges: string[];
}

// Subcomponentes
import { OrderConfirmation } from './order-confirmation/order-confirmation';
import { OrderSummary } from './order-summary/order-summary';
import { PaymentMethod } from './payment-method/payment-method';
import { TotalsSummary } from './totals-summary/totals-summary';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule, 
    OrderConfirmation,
    OrderSummary,
    PaymentMethod,
    TotalsSummary,
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  // === ESTADO ===
  
  cartItems = signal<CartItem[]>([
    { id: 1, name: 'Cuaderno Universitario Norma 100 Hojas', variant: 'Azul - 100 hojas', quantity: 2, price: 2.50, customMessage: '' },
    { id: 2, name: 'Bolígrafo BIC Cristal Azul (Caja 50 unidades)', variant: 'Azul', quantity: 1, price: 25.00, customMessage: '' }
  ]);
  selectedPaymentMethod = signal<string>('');
  transferProof = signal<File | null>(null);
  showTransferInstructions = signal(false);
  orderSubmitted = signal(false);

  // === DATOS FIJOS ===
  paymentMethods: PaymentMethodInterface[] = [
    { id: 'transfer', name: 'Transferencia Bancaria', description: 'Transfiere a nuestras cuentas bancarias', icon: 'ri-bank-line', badges: ['Banco Pichincha', 'Banco Guayaquil'] },
    { id: 'contraentrega', name: 'Pago Contraentrega', description: 'Paga en efectivo al recibir tu pedido', icon: 'ri-hand-coin-line', badges: ['Efectivo'] }
  ];

  // === PROPIEDADES CALCULADAS ===

  get subtotal(): number {
    return this.cartItems().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get shippingCost(): number {
    return this.subtotal >= 25 ? 0 : 3.50;
  }

  get total(): number {
    return this.subtotal + this.shippingCost;
  }
  
  // === MANEJADORES DE EVENTOS ===

  handleQuantityChange({ itemId, newQuantity }: { itemId: number, newQuantity: number }) {
    if (newQuantity < 1) { this.handleRemoveItem(itemId); return; }
    this.cartItems.update(items => items.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
  }

  handleRemoveItem(itemId: number) {
    this.cartItems.update(items => items.filter(item => item.id !== itemId));
  }

  handlePaymentMethodChange(methodId: string) {
    this.selectedPaymentMethod.set(methodId);
    this.showTransferInstructions.set(methodId === 'transfer');
    this.transferProof.set(null); 
  }

  handleTransferProofUpload(file: File | null) {
    this.transferProof.set(file);
  }

  handleSubmitOrder() {
    this.orderSubmitted.set(true);
  }
}