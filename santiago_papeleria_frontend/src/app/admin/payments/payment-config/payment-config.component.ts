import { Component, inject, signal, OnInit, ChangeDetectorRef, NgZone, ChangeDetectionStrategy, ApplicationRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { PaymentService, PaymentConfig, BankAccount } from '../../../services/payment.service';
import { finalize } from 'rxjs/operators';

@Component({
    selector: 'app-payment-config',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        LucideAngularModule
    ],
    providers: [],
    templateUrl: './payment-config.component.html',
    styleUrl: './payment-config.component.scss',
    changeDetection: ChangeDetectionStrategy.Default
})
export class PaymentConfigComponent implements OnInit {
    private paymentService = inject(PaymentService);
    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);
    private appRef = inject(ApplicationRef);

    isLoading = signal(false);
    isSaving = signal(false);
    toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);

    config = signal<PaymentConfig>({
        transferActive: true,
        cashActive: false,
        pickupActive: true,
        bankAccounts: [],
        cashConfig: { maxAmount: 100, restrictedZones: [] }
    });

    // Modals
    showBankModal = false;
    currentAccount: Partial<BankAccount> = {};
    isEditingAccount = false;

    ngOnInit() {
        this.loadConfig();
    }

    loadConfig() {
        this.isLoading.set(true);
        this.paymentService.getConfig().pipe(
            finalize(() => {
                this.ngZone.run(() => {
                    this.isLoading.set(false);
                    this.cdr.detectChanges();
                    this.appRef.tick();
                });
            })
        ).subscribe({
            next: (data) => {
                this.ngZone.run(() => {
                    this.config.set(data);
                });
            },
            error: (err) => {
                console.error(err);
                this.showToast('Error al cargar configuración', 'error');
            }
        });
    }

    updateConfigField(field: keyof PaymentConfig, value: any) {
        this.config.update(c => ({ ...c, [field]: value }));
    }

    saveConfigAll() {
        const p = this.config();

        // Validaciones
        if (p.cashConfig && p.cashConfig.maxAmount < 0) {
            this.showToast('El monto máximo de efectivo no puede ser negativo', 'error');
            return;
        }

        this.isSaving.set(true);
        this.paymentService.updateConfig(p).pipe(
            finalize(() => {
                this.ngZone.run(() => {
                    this.isSaving.set(false);
                    this.cdr.detectChanges();
                });
            })
        ).subscribe({
            next: (data) => {
                this.ngZone.run(() => {
                    this.config.set(data);
                    this.showToast('Configuración guardada correctamente', 'success');
                });
            },
            error: (err) => {
                console.error(err);
                this.showToast('Error al guardar configuración', 'error');
            }
        });
    }

    // --- Bank Account Logic ---
    openAddAccount() {
        this.currentAccount = { type: 'Ahorros', isActive: true };
        this.isEditingAccount = false;
        this.showBankModal = true;
    }

    editAccount(account: BankAccount) {
        this.currentAccount = { ...account };
        this.isEditingAccount = true;
        this.showBankModal = true;
    }

    saveAccount() {
        if (!this.currentAccount.bankName?.trim() || !this.currentAccount.accountNumber?.trim()) {
            this.showToast('Completa todos los campos requeridos', 'error');
            return;
        }

        const handler = {
            next: (res: PaymentConfig) => {
                this.ngZone.run(() => {
                    this.config.set(res);
                    this.showBankModal = false;
                    this.showToast(this.isEditingAccount ? 'Cuenta actualizada' : 'Cuenta agregada', 'success');
                    this.cdr.detectChanges();
                    this.appRef.tick();
                });
            },
            error: () => {
                this.ngZone.run(() => {
                    this.showToast('Error actualizando cuentas', 'error');
                });
            }
        };

        if (this.isEditingAccount) {
            this.paymentService.updateBankAccount(this.currentAccount.accountNumber!, this.currentAccount).subscribe(handler);
        } else {
            this.paymentService.addBankAccount(this.currentAccount).subscribe(handler);
        }
    }

    deleteAccount(number: string) {
        if (confirm('¿Estás seguro de eliminar esta cuenta bancaria?')) {
            this.paymentService.removeBankAccount(number).subscribe({
                next: (res: PaymentConfig) => {
                    this.ngZone.run(() => {
                        this.config.set(res);
                        this.showToast('Cuenta eliminada', 'success');
                        this.cdr.detectChanges();
                        this.appRef.tick();
                    });
                },
                error: () => {
                    this.ngZone.run(() => {
                        this.showToast('Error eliminando cuenta', 'error');
                    });
                }
            });
        }
    }

    showToast(msg: string, type: 'success' | 'error') {
        this.toast.set({ msg, type });
        this.cdr.detectChanges();
        setTimeout(() => {
            this.toast.set(null);
            this.cdr.detectChanges();
        }, 3000);
    }
}
