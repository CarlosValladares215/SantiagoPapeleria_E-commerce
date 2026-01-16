import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, ControlContainer } from '@angular/forms';

@Component({
  selector: 'app-step-account-type',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-account-type.html',
  styleUrl: './step-account-type.scss',
})
export class StepAccountTypeComponent {
  parentForm = inject(ControlContainer).control as FormGroup;

  @Input() isSubmitting = false;
  @Output() next = new EventEmitter<void>();

  get isWholesaler() {
    return this.parentForm?.get('tipo_cliente')?.value === 'MAYORISTA';
  }

  onNext() {
    this.next.emit();
  }
}
