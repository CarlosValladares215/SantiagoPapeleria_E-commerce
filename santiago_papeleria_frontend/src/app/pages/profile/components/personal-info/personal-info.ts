import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../services/auth/auth.service';

@Component({
    selector: 'app-personal-info',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './personal-info.html'
})
export class PersonalInfoComponent {
    authService = inject(AuthService);
    fb = inject(FormBuilder);

    profileForm: FormGroup;
    passwordForm: FormGroup;

    isEditing = false;
    isChangingPassword = false;
    isLoading = false;
    successMessage = '';

    constructor() {
        this.profileForm = this.fb.group({
            // Personal Data
            nombres: [{ value: '', disabled: true }, [Validators.required]],
            email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
            telefono: [{ value: '', disabled: true }],
            identificacion: [{ value: '', disabled: true }],

            // Business Data (Mayorista Only - Read Only)
            nombre_negocio: [{ value: '', disabled: true }],
            ruc: [{ value: '', disabled: true }],
            direccion_negocio: [{ value: '', disabled: true }],
            ciudad_negocio: [{ value: '', disabled: true }],
            telefono_negocio: [{ value: '', disabled: true }],
        });

        this.passwordForm = this.fb.group({
            currentPassword: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required]
        }, { validators: this.passwordMatchValidator });

        // Initialize logic
        const user = this.authService.user();
        if (user) {
            this.profileForm.patchValue({
                nombres: user.nombres,
                email: user.email,
                telefono: user.telefono,
                identificacion: user.cedula || '',
                nombre_negocio: user.datos_negocio?.nombre_negocio || '',
                ruc: user.datos_negocio?.ruc || '',
                direccion_negocio: user.datos_negocio?.direccion_negocio || '',
                ciudad_negocio: user.datos_negocio?.ciudad || '',
                telefono_negocio: user.datos_negocio?.telefono_negocio || ''
            });
        }
    }

    get isMayorista(): boolean {
        return this.authService.user()?.tipo_cliente === 'MAYORISTA';
    }

    passwordMatchValidator(g: FormGroup) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { 'mismatch': true };
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
        if (this.isEditing) {
            this.profileForm.enable();
            if (this.isMayorista) {
                // Business Data stays disabled (Read Only)
                this.profileForm.get('nombre_negocio')?.disable();
                this.profileForm.get('ruc')?.disable();
                this.profileForm.get('direccion_negocio')?.disable();
                this.profileForm.get('ciudad_negocio')?.disable();
                this.profileForm.get('telefono_negocio')?.disable();
            }
            this.profileForm.get('email')?.disable();
        } else {
            this.profileForm.disable();
        }
    }

    onSubmitPersonal() {
        if (this.profileForm.valid) {
            this.isLoading = true;
            const formValue = this.profileForm.getRawValue();
            const user = this.authService.user();
            if (!user?._id) return;

            const updateData: any = {
                nombres: formValue.nombres,
                telefono: formValue.telefono,
            };

            if (!this.isMayorista) {
                updateData.cedula = formValue.identificacion;
            }

            this.updateUser(user._id, updateData, 'Perfil actualizado correctamente');
        }
    }

    toggleChangePassword() {
        this.isChangingPassword = !this.isChangingPassword;
        if (!this.isChangingPassword) {
            this.passwordForm.reset();
        }
    }

    onSubmitPassword() {
        if (this.passwordForm.valid) {
            this.isLoading = true;
            const { currentPassword, newPassword } = this.passwordForm.value;

            this.authService.changePassword(currentPassword, newPassword).subscribe({
                next: (res) => {
                    this.isLoading = false;
                    this.isChangingPassword = false;
                    this.passwordForm.reset();
                    this.successMessage = res.message || 'Contraseña actualizada correctamente';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (err) => {
                    this.isLoading = false;
                    alert(err.error?.message || 'Error al actualizar contraseña');
                }
            });
        }
    }

    private updateUser(id: string, data: any, successMsg: string) {
        this.authService.updateProfile(id, data).subscribe({
            next: () => {
                this.isLoading = false;
                this.isEditing = false;
                this.profileForm.disable();
                this.successMessage = successMsg;
                setTimeout(() => this.successMessage = '', 3000);
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
            }
        });
    }
}
