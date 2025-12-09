import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.scss',
})
export class OrderConfirmation {
  // === INPUTS ===
  // Recibe el método de pago seleccionado
  @Input({ required: true }) selectedPaymentMethod!: string;
  
  // Recibe el total del pedido (ESTE ES EL QUE FALTABA Y CAUSABA EL ERROR NG8002)
  @Input({ required: true }) total!: number;

  // Propiedad calculada para el mensaje
  public paymentMessage = computed(() => {
    const totalAmount = this.total ? this.total.toFixed(2) : '0.00';
    
    if (this.selectedPaymentMethod === 'transfer') {
      return 'Hemos recibido tu comprobante de transferencia. Verificaremos el pago en las próximas 2-4 horas.';
    }
    
    if (this.selectedPaymentMethod === 'contraentrega') {
      return `Recuerda tener el monto exacto: $${totalAmount} en efectivo para el courier.`;
    }
    
    return 'Tu pedido ha sido confirmado. Pronto recibirás los detalles del envío.';
  });
}