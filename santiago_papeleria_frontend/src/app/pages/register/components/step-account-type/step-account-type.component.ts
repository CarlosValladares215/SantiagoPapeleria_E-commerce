import { Component, EventEmitter, Input, Output, inject, ViewChild, ElementRef } from '@angular/core';
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

  @ViewChild('continueBtn') continueBtn!: ElementRef;

  get isWholesaler() {
    return this.parentForm?.get('tipo_cliente')?.value === 'MAYORISTA';
  }

  onNext() {
    this.next.emit();
  }

  scrollToButton() {
    // Small timeout to allow radio selection to update UI if needed, though usually not strictly necessary for scroll
    setTimeout(() => {
      if (this.continueBtn) {
        this.continueBtn.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }
}
