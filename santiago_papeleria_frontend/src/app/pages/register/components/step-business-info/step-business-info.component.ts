import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, ControlContainer } from '@angular/forms';

@Component({
  selector: 'app-step-business-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-business-info.html',
  styleUrl: './step-business-info.scss',
})
export class StepBusinessInfoComponent {
  parentForm = inject(ControlContainer).control as FormGroup;

  @Input() isSubmitting = false;
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  // ============ INPUT SANITIZATION METHODS ============

  /**
   * RUC: Solo permite números, máximo 13 dígitos (Ecuador)
   */
  sanitizeRUC(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 13);
    this.parentForm.get('datos_fiscales')?.get('identificacion')?.setValue(input.value);
  }

  /**
   * Ciudad Fiscal: Solo permite letras, espacios y tildes
   */
  sanitizeCiudad(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    this.parentForm.get('datos_fiscales')?.get('ciudad_fiscal')?.setValue(input.value);
  }

  /**
   * Teléfono del Negocio: Formato de teléfono fijo Ecuador (07-XXX-XXXX)
   */
  formatTelefonoNegocio(event: Event): void {
    const input = event.target as HTMLInputElement;

    // Remove non-digits
    let digits = input.value.replace(/\D/g, '').slice(0, 9);

    // Format as XX-XXX-XXXX (landline format)
    let formatted = '';
    if (digits.length > 0) {
      formatted = digits.slice(0, 2);
      if (digits.length > 2) {
        formatted += '-' + digits.slice(2, 5);
      }
      if (digits.length > 5) {
        formatted += '-' + digits.slice(5, 9);
      }
    }

    input.value = formatted;
    // Store raw digits in form (without hyphens)
    this.parentForm.get('datos_fiscales')?.get('telefono_negocio')?.setValue(digits);
  }

  /**
   * Nombre del Negocio: Permite letras, números, espacios y algunos símbolos comunes
   */
  sanitizeNombreNegocio(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-\.&,]/g, '').slice(0, 100);
    this.parentForm.get('datos_fiscales')?.get('razon_social')?.setValue(input.value);
  }

  // ============ NAVIGATION METHODS ============

  onNext() {
    // Validate only fiscal data (this step is for business/fiscal info)
    const fiscalGroup = this.parentForm.get('datos_fiscales');

    fiscalGroup?.markAllAsTouched();

    if (fiscalGroup?.valid) {
      this.next.emit();
    }
  }

  onBack() {
    this.back.emit();
  }
}
