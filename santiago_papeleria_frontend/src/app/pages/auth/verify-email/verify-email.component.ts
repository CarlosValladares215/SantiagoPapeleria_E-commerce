import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth/auth.service';

// Components
import { Header } from '../../../shared/header/header.component';
import { Footer } from '../../../shared/footer/footer.component';
import { UnifiedFeedbackModalComponent, ModalType } from '../../../shared/components/unified-feedback-modal/unified-feedback-modal.component';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Header, Footer, UnifiedFeedbackModalComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-[#F2F2F2] to-white flex flex-col">
      <app-header />
      
      <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="max-w-md mx-auto">
          <!-- Breadcrumb -->
          <nav class="flex items-center gap-2 mb-6 text-xs text-[#104D73]/80 justify-center">
              <a routerLink="/" class="hover:text-[#F2CB07] transition-colors">Inicio</a>
              <span class="material-symbols-outlined text-[10px]">chevron_right</span>
              <span class="text-[#104D73] font-bold">Verificar Correo</span>
          </nav>

          <!-- Header -->
          <div class="text-center mb-8">
            <div class="bg-gradient-to-br from-[#104D73] to-[#012E40] p-4 rounded-2xl w-20 h-20 mx-auto mb-4 shadow-lg flex items-center justify-center">
              <i class="ri-mail-check-line text-3xl text-[#F2CB07]"></i>
            </div>
            <h1 class="text-3xl font-bold text-[#104D73] mb-2">Verifica tu Correo</h1>
            <p class="text-gray-600">Ingresa el código que enviamos a tu correo</p>
          </div>

          <!-- Verification Form -->
          <div class="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <form (ngSubmit)="handleVerify()" class="space-y-6">
              <!-- Verification Code Input -->
              <div>
                <label htmlFor="verificationCode" class="block text-sm font-medium text-gray-700 mb-2 text-center">
                  <i class="ri-key-line mr-2 text-[#104D73]"></i>
                  Código de Verificación
                </label>
                <input
                  type="text"
                  id="verificationCode"
                  name="verificationCode"
                  [(ngModel)]="verificationCode"
                  (input)="handleInputChange($event)"
                  placeholder="000000"
                  maxlength="6"
                  required
                  class="w-full text-center text-2xl font-bold tracking-widest form-input rounded-xl border-gray-300 focus:border-[#104D73] focus:ring focus:ring-[#104D73]/20 transition-all"
                  style="letter-spacing: 0.5em;"
                />
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="isLoading || verificationCode.length !== 6"
                class="w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-md text-lg font-medium text-white bg-gradient-to-r from-[#104D73] to-[#012E40] hover:from-[#0d3f5e] hover:to-[#001e2b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#104D73] disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
              >
                <ng-container *ngIf="isLoading; else verifyText">
                    <i class="ri-loader-4-line animate-spin mr-2"></i>
                    Verificando...
                </ng-container>
                <ng-template #verifyText>
                    <i class="ri-checkbox-circle-line mr-2"></i>
                    Verificar Cuenta
                </ng-template>
              </button>
            </form>

            <!-- Resend Code -->
            <div class="mt-6 text-center">
              <button
                *ngIf="canResend; else countdownTemplate"
                (click)="handleResendCode()"
                type="button"
                class="text-[#104D73] hover:text-[#012E40] font-medium text-sm transition-colors cursor-pointer flex items-center justify-center mx-auto"
              >
                <i class="ri-mail-send-line mr-2"></i>
                Reenviar código
              </button>
              
              <ng-template #countdownTemplate>
                <p class="text-gray-400 text-sm">
                  Podrás reenviar el código en <span class="font-mono font-bold">{{ countdown }}</span>s
                </p>
              </ng-template>
            </div>
          </div>
        </div>
      </main>

      <app-footer />
      
      <app-unified-feedback-modal
        [isOpen]="modalOpen"
        [type]="modalType"
        [title]="modalTitle"
        [message]="modalMessage"
        [actionText]="modalAction"
        (action)="handleModalAction()">
      </app-unified-feedback-modal>
    </div>
  `,
  styles: [`
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
  `]
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  verificationCode: string = '';
  isLoading: boolean = false;
  canResend: boolean = false;
  countdown: number = 60;

  // Modal State
  modalOpen = false;
  modalType: ModalType = 'success';
  modalTitle = '';
  modalMessage = '';
  modalAction = 'Continuar';

  private timer: any;
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  email: string = '';

  ngOnInit() {
    // Scroll to top on page load
    window.scrollTo({ top: 0, behavior: 'instant' });

    this.email = this.route.snapshot.queryParamMap.get('email') || localStorage.getItem('pendingVerificationEmail') || '';
    const token = this.route.snapshot.queryParamMap.get('token');

    if (token) {
      this.verifyWithToken(token);
    } else {
      this.startCountdown();
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  startCountdown() {
    this.canResend = false;
    this.countdown = 60;
    if (this.timer) clearInterval(this.timer);

    // Use NgZone to ensure Angular detects the changes from setInterval
    this.ngZone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        this.ngZone.run(() => {
          this.countdown--;
          if (this.countdown <= 0) {
            this.canResend = true;
            clearInterval(this.timer);
          }
          this.cdr.detectChanges();
        });
      }, 1000);
    });
  }

  verifyWithToken(token: string) {
    this.isLoading = true;

    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.verified) {
          // LOGIN AFTER VERIFY
          if (res.access_token && res.user) {
            // Manually save token
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('token', res.access_token);
            }
            // Update Auth Service State
            this.authService.setSession(res.user);
          }

          this.showModal('success', '¡Cuenta Verificada!', 'Tu cuenta ha sido verificada exitosamente. Ahora serás redirigido.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err.error?.message || 'El enlace es inválido o ha expirado.';
        this.showModal('error', 'Error de Verificación', msg);
      }
    });
  }

  handleInputChange(event: any) {
    this.verificationCode = this.verificationCode.toUpperCase();
  }

  handleVerify() {
    if (this.verificationCode.length !== 6) return;
    this.verifyWithToken(this.verificationCode);
  }

  handleResendCode() {
    this.startCountdown();
    const emailToUse = this.email;
    if (!emailToUse) {
      this.showModal('error', 'Error', 'No se pudo encontrar el email para reenviar.');
      return;
    }

    this.authService.resendVerificationEmail(emailToUse).subscribe({
      next: () => {
        this.showModal('success', 'Enviado', 'Se ha enviado un nuevo código a tu correo.');
      },
      error: (err) => {
        this.showModal('error', 'Error', 'No se pudo reenviar el código. Intenta más tarde.');
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
    if (this.modalType === 'success' && this.modalTitle === '¡Cuenta Verificada!') {
      this.router.navigate(['/']); // Redirect to Home after auto-login
    }
  }
}

