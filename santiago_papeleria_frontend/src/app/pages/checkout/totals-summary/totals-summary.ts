import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, NgIf } from '@angular/common';

@Component({
  selector: 'app-totals-summary',
  standalone: true,
  // Necesitamos CommonModule para *ngIf y CurrencyPipe para el formato de moneda
  imports: [CommonModule, CurrencyPipe, NgIf],
  templateUrl: './totals-summary.html',
  // Asegúrate de que este archivo existe y no contiene comentarios JS
  styleUrl: './totals-summary.scss'
})
export class TotalsSummary {
  // === INPUTS (Recibidos del padre Checkout) ===
  @Input({ required: true }) subtotal!: number;
  @Input({ required: true }) shippingCost!: number;
  @Input({ required: true }) total!: number;
  @Input({ required: true }) selectedPaymentMethod!: string;
  
  // Recibe el archivo de comprobante para la validación
  // ¡Este es el Input que faltaba y causaba el error!
  @Input() transferProof: File | null = null; 

  // === OUTPUTS (Evento emitido al padre Checkout) ===
  
  // Emite el evento para iniciar el proceso de envío del pedido
  @Output() submitOrder = new EventEmitter<void>();

  // === PROPIEDADES CALCULADAS (Funcionalidad principal de este componente) ===
  
  /**
   * Determina si el botón de "Confirmar Pedido" debe estar habilitado.
   */
  public isOrderButtonEnabled = computed(() => {
    const method = this.selectedPaymentMethod;

    if (!method) {
      return false; // No hay método seleccionado
    }
    
    if (method === 'transfer') {
      // Para transferencia, requiere que el comprobante haya sido subido
      return !!this.transferProof;
    }
    
    // Para 'contraentrega', solo requiere que el método esté seleccionado
    return true;
  });

  /**
   * Genera el texto de ayuda o error para el usuario, si el botón está deshabilitado.
   */
  public buttonHelperText = computed(() => {
    if (!this.selectedPaymentMethod) {
      return 'Selecciona un método de pago para continuar.';
    }
    if (this.selectedPaymentMethod === 'transfer' && !this.transferProof) {
      return 'Sube el comprobante de transferencia para confirmar.';
    }
    return '';
  });

  // === MANEJADOR DE EVENTOS ===

  /**
   * Ejecuta el evento submitOrder si el botón está habilitado.
   */
  handleConfirmOrder(): void {
    if (this.isOrderButtonEnabled()) {
      this.submitOrder.emit();
    }
  }
}