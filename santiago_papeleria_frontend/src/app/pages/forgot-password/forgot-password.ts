import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';
import { UnifiedFeedbackModalComponent, ModalType } from '../../shared/components/unified-feedback-modal/unified-feedback-modal.component';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [FormsModule, CommonModule, RouterLink, UnifiedFeedbackModalComponent],
    templateUrl: './forgot-password.html',
    styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
    email = '';
    isLoading = false;

    // Modal State
    modalOpen = false;
    modalType: ModalType = 'success';
    modalTitle = '';
    modalMessage = '';
    modalAction = 'Continuar';

    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);

    constructor(private router: Router) { }

    handleSubmit() {
        if (!this.email) return;

        this.isLoading = true;
        this.authService.forgotPassword(this.email).subscribe({
            next: (res) => {
                this.isLoading = false;
                this.showModal('success', 'Correo Enviado', res.message || 'Si el correo existe, se han enviado las instrucciones.');
            },
            error: (err) => {
                this.isLoading = false;
                // Even on error, we show success for security (prevent user enumeration)
                this.showModal('success', 'Correo Enviado', 'Si el correo existe, se han enviado las instrucciones.');
            }
        });
    }

    showModal(type: ModalType, title: string, message: string) {
        this.modalType = type;
        this.modalTitle = title;
        this.modalMessage = message;
        this.modalOpen = true;
        // Force change detection to render modal immediately
        this.cdr.detectChanges();
    }

    handleModalAction() {
        this.modalOpen = false;
        if (this.modalType === 'success') {
            this.router.navigate(['/login']);
        }
    }
}

