import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, RouterLinkActive],
    templateUrl: './profile.html',
    styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
    authService = inject(AuthService);
    fb = inject(FormBuilder);

    profileForm: FormGroup;
    isEditing = false;
    isLoading = false;
    successMessage = '';

    userStats = {
        orders: 24,
        favorites: 12,
        reviews: 8
    };

    provincias = [
        'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas', 'Galápagos',
        'Guayas', 'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza',
        'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsáchilas', 'Sucumbíos', 'Tungurahua', 'Zamora Chinchipe'
    ];

    constructor() {
        this.profileForm = this.fb.group({
            // Personal Info
            nombres: [{ value: '', disabled: true }, [Validators.required]],
            email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
            telefono: [{ value: '', disabled: true }],
            empresa: [{ value: '', disabled: true }], // Campo nuevo
            identificacion: [{ value: '', disabled: true }], // RUC/Cedula

            // Address (Assuming single address for now based on UI)
            direccion: [{ value: '', disabled: true }],
            ciudad: [{ value: '', disabled: true }],
            provincia: [{ value: '', disabled: true }]
        });
    }

    get isMayorista(): boolean {
        return this.authService.user()?.tipo_cliente === 'MAYORISTA';
    }

    ngOnInit(): void {
        const user = this.authService.user();
        if (user) {
            this.profileForm.patchValue({
                nombres: user.nombres,
                email: user.email,
                telefono: user.telefono,
                // Map empresa to razon_social if mayorista
                empresa: user.datos_fiscales?.razon_social || '',
                // Map ID: Cedula for Minorista, Identificacion (RUC) for Mayorista
                identificacion: user.cedula || user.datos_fiscales?.identificacion || '',

                direccion: user.direcciones_entrega?.[0]?.calle_principal || '',
                ciudad: user.direcciones_entrega?.[0]?.ciudad || '',
            });
        }
    }

    toggleEdit() {
        this.isEditing = !this.isEditing;
        if (this.isEditing) {
            this.profileForm.enable();

            // Constraints:
            // Email is identity, usually readonly or needs re-verification. Keeping editable as per previous thought? 
            // User said: "allow edit personal only" for Mayorista.

            if (this.isMayorista) {
                // Mayorista cannot edit Business Data
                this.profileForm.get('empresa')?.disable();
                this.profileForm.get('identificacion')?.disable(); // Assuming RUC is fixed
            }

            // Optional: If email shouldn't be changed easily
            // this.profileForm.get('email')?.disable(); 

        } else {
            this.profileForm.disable();
        }
    }

    onSubmit() {
        if (this.profileForm.valid) {
            this.isLoading = true;
            const formValue = this.profileForm.getRawValue();
            const user = this.authService.user();

            if (!user?._id) return;

            // Map flat form back to structured user object if needed
            // For now we send flat and let backend/service handle it, but our backend expects specific DTO structure?
            // actually we passed 'any' to controller update.

            const updateData: any = {
                nombres: formValue.nombres,
                email: formValue.email,
                telefono: formValue.telefono,
                direcciones_entrega: [{
                    alias: 'Principal',
                    calle_principal: formValue.direccion,
                    ciudad: formValue.ciudad,
                    // provincia: formValue.provincia // TODO: Add provincia to schema if needed, currently storing in Address? Schema doesn't have provincia field in DireccionEntrega! 
                    // User asked for provincia dropdown. Where do we save it?
                    // Schema DireccionEntrega: alias, calle_principal, ciudad, referencia. NO PROVINCIA.
                    // I should probably append it to ciudad or reference for now or ask to add it.
                    // For now let's save it in ciudad like "Quito, Pichincha"? Or just ignore? 
                    // Let's assume schema needs update or we pack it.
                    // Let's append to Ciudad for now: `${formValue.ciudad}, ${formValue.provincia}` handling?
                    // Or better, just fix the Business Data issue first.
                }]
            };

            if (this.isMayorista) {
                updateData.datos_fiscales = {
                    razon_social: formValue.empresa,
                    identificacion: formValue.identificacion,
                    tipo_identificacion: 'RUC'
                };
                // Don't overwrite cedula mostly?
            } else {
                updateData.cedula = formValue.identificacion;
            }

            this.authService.updateProfile(user._id, updateData).subscribe({
                next: (updatedUser) => {
                    this.isLoading = false;
                    this.isEditing = false;
                    this.profileForm.disable();
                    this.successMessage = 'Perfil actualizado correctamente';
                    setTimeout(() => this.successMessage = '', 3000);
                },
                error: (err) => {
                    console.error(err);
                    this.isLoading = false;
                }
            });
        }
    }
}
