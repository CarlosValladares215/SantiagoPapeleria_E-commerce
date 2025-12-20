import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { UnifiedFeedbackModalComponent, ModalType } from '../../shared/components/unified-feedback-modal/unified-feedback-modal.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, UnifiedFeedbackModalComponent],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss']
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);

  resetForm: FormGroup;
  token = '';
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  // Modal State
  modalOpen = false;
  modalType: ModalType = 'success';
  modalTitle = '';
  modalMessage = '';
  modalAction = 'Continuar';

  constructor() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.resetForm.valid && this.token) {
      this.isLoading = true;
      const newPassword = this.resetForm.get('password')?.value;

      this.authService.resetPassword(this.token, newPassword).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.showModal('success', '¡Contraseña Actualizada!', res.message || 'Tu contraseña ha sido restablecida correctamente.');
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err.error?.message || 'El enlace es inválido o ha expirado.';
          this.showModal('error', 'Error', msg);
        }
      });
    }
  }

  showModal(type: ModalType, title: string, message: string) {
    this.modalType = type;
    this.modalTitle = title;
    this.modalMessage = message;
    this.modalOpen = true;
  }

  handleModalAction() {
    this.modalOpen = false;
    if (this.modalType === 'success') {
      this.router.navigate(['/login']);
    }
  }
}
