import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, ControlContainer } from '@angular/forms';

@Component({
  selector: 'app-step-personal-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-personal-info.html',
  styleUrl: './step-personal-info.scss',
})
export class StepPersonalInfoComponent {
  parentForm = inject(ControlContainer).control as FormGroup;

  @Input() isSubmitting = false;
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  passwordVisible = false;
  confirmPasswordVisible = false;
  showPassword = false;
  showConfirmPassword = false;

  validateNameInput(event: any) {
    const input = event.target as HTMLInputElement;
    // Allow spaces and letters
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.parentForm.get('nombres')?.setValue(input.value);
  }

  formatPhoneNumber(event: any) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits

    // Format as 099-999-9999
    if (value.length > 10) value = value.substring(0, 10);

    // Apply masking
    if (value.length > 6) {
      value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `${value.slice(0, 3)}-${value.slice(3)}`;
    }

    input.value = value;
    this.parentForm.get('telefono')?.setValue(value);
  }

  onNext() {
    this.next.emit();
  }

  onBack() {
    this.back.emit();
  }
}
