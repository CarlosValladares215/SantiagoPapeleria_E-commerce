import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PaymentMethodInterface {
  id: string;
  name: string;
  description: string;
  icon: string;
  badges: string[];
}

@Component({
  selector: 'app-payment-method',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-method.html',
  styleUrl: './payment-method.scss'
})
export class PaymentMethod {

  /* ---------- Inputs ---------- */
  @Input() transferProof: File | null = null;
  @Input() total!: number;
  @Input({ required: true }) paymentMethods!: PaymentMethodInterface[];
  @Input({ required: true }) selectedPaymentMethod!: string;
  @Input({ required: true }) showTransferInstructions!: boolean;

  /* ---------- Outputs ---------- */
  @Output() paymentMethodChange = new EventEmitter<string>();
  @Output() transferProofUpload = new EventEmitter<File | null>();

  /* ---------- Propiedades calculadas ---------- */
  fileName = computed(() => this.transferProof?.name ?? '');

  /* ---------- Métodos ---------- */
  selectPaymentMethod(methodId: string): void {
    this.paymentMethodChange.emit(methodId);
  }

  handleFileUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.transferProofUpload.emit(file);
  }

  removeFile(): void {
    this.transferProofUpload.emit(null);
  }
}