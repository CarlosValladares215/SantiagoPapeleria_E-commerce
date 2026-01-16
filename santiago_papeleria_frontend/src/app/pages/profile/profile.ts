import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { ActivatedRoute } from '@angular/router';
import { MapComponent } from '../../shared/components/map/map.component';
import { HttpClient } from '@angular/common/http';
import { DireccionEntrega } from '../../models/usuario.model';
import { ProfileSidebarComponent } from '../../components/profile-sidebar/profile-sidebar';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MapComponent, ProfileSidebarComponent],
    templateUrl: './profile.html',
    styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
    authService = inject(AuthService);
    fb = inject(FormBuilder);
    route = inject(ActivatedRoute);
    http = inject(HttpClient);

    activeTab: 'personal' | 'addresses' = 'personal';

    // Personal Info
    profileForm: FormGroup;
    isEditing = false;

    // Address Management
    addressForm: FormGroup;
    isAddingAddress = false;
    editingAddressIndex: number | null = null;
    showAddressForm = false;

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

        this.addressForm = this.fb.group({
            alias: ['', Validators.required],
            calle_principal: ['', Validators.required],
            ciudad: ['', Validators.required],
            provincia: ['', Validators.required],
            codigo_postal: [''],
            referencia: [''],
            lat: [null, Validators.required],
            lng: [null, Validators.required]
        });

        this.passwordForm = this.fb.group({
            currentPassword: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required]
        }, { validators: this.passwordMatchValidator });
    }

    passwordForm: FormGroup;
    isChangingPassword = false;

    passwordMatchValidator(g: FormGroup) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { 'mismatch': true };
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

    get isMayorista(): boolean {
        return this.authService.user()?.tipo_cliente === 'MAYORISTA';
    }

    get addresses(): DireccionEntrega[] {
        return this.authService.user()?.direcciones_entrega || [];
    }

    ngOnInit(): void {
        const user = this.authService.user();
        if (user) {
            this.profileForm.patchValue({
                nombres: user.nombres,
                email: user.email,
                telefono: user.telefono,
                identificacion: user.cedula || '',

                // Patch Business Data
                nombre_negocio: user.datos_negocio?.nombre_negocio || '',
                ruc: user.datos_negocio?.ruc || '',
                direccion_negocio: user.datos_negocio?.direccion_negocio || '',
                ciudad_negocio: user.datos_negocio?.ciudad || '',
                telefono_negocio: user.datos_negocio?.telefono_negocio || ''
            });
        }

        // Check for query params to switch tab
        this.route.queryParams.subscribe(params => {
            if (params['tab'] === 'addresses') {
                this.activeTab = 'addresses';
                if (params['action'] === 'new') {
                    this.initNewAddress();
                }
            }
        });
    }

    // --- Tab Management ---
    switchTab(tab: 'personal' | 'addresses') {
        this.activeTab = tab;
        this.isEditing = false;
        this.showAddressForm = false;
    }

    // --- Personal Info Logic ---
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
            // Email usually read-only
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

            if (this.isMayorista) {
                // Mayorista specific restrictions if any
            } else {
                updateData.cedula = formValue.identificacion;
            }

            this.updateUser(user._id, updateData, 'Perfil actualizado correctamente');
        }
    }

    // --- Address Logic ---
    initNewAddress() {
        this.addressForm.reset();
        // Set default map location if needed? MapComponent handles default.
        this.editingAddressIndex = null;
        this.showAddressForm = true;
    }

    editAddress(index: number) {
        const addr = this.addresses[index];
        this.editingAddressIndex = index;
        this.addressForm.patchValue({
            alias: addr.alias,
            calle_principal: addr.calle_principal,
            ciudad: addr.ciudad,
            provincia: addr.provincia,
            codigo_postal: addr.codigo_postal || '',
            referencia: addr.referencia,
            lat: addr.location?.lat,
            lng: addr.location?.lng
        });
        this.showAddressForm = true;
    }

    cancelAddressEdit() {
        this.showAddressForm = false;
        this.editingAddressIndex = null;
    }

    onLocationSelected(coords: { lat: number, lng: number }) {
        this.addressForm.patchValue({
            lat: coords.lat,
            lng: coords.lng
        });

        // Reverse Geocoding
        this.getAddressFromCoords(coords.lat, coords.lng);
    }

    getAddressFromCoords(lat: number, lng: number) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

        this.http.get<any>(url).subscribe({
            next: (data) => {
                if (data && data.address) {
                    const addr = data.address;

                    // Map OSM helpers to our form
                    // Street: road || pedestrian || suburb
                    const road = addr.road || addr.pedestrian || addr.suburb || '';
                    const houseNumber = addr.house_number ? ` ${addr.house_number}` : '';
                    const calle = `${road}${houseNumber}`;

                    // City: city || town || village || county
                    const city = addr.city || addr.town || addr.village || addr.county || '';

                    // Province: state || region
                    const province = addr.state || addr.region || '';

                    // Only patch if empty or user wants to overwrite? 
                    // Usually we overwrite on explicit marker move
                    this.addressForm.patchValue({
                        calle_principal: calle,
                        ciudad: city,
                        // Try to match exact province name from our list or leave generic
                        provincia: this.matchProvince(province)
                    });
                }
            },
            error: (err) => console.error('Geocoding error', err)
        });
    }

    matchProvince(incoming: string): string {
        // Simple fuzzy match or exact match from our 'provincias' list
        const found = this.provincias.find(p => p.toLowerCase() === incoming.toLowerCase());
        return found || incoming; // Return incoming even if not in list, or empty? Leaving as incoming.
    }

    saveAddress() {
        if (this.addressForm.valid) {
            this.isLoading = true;
            const val = this.addressForm.value;
            const newAddr: DireccionEntrega = {
                alias: val.alias,
                calle_principal: val.calle_principal,
                ciudad: val.ciudad,
                provincia: val.provincia,
                codigo_postal: val.codigo_postal,
                referencia: val.referencia,
                location: {
                    lat: val.lat,
                    lng: val.lng
                }
            };

            const user = this.authService.user();
            if (!user?._id) return;

            const currentAddresses = [...(user.direcciones_entrega || [])];

            if (this.editingAddressIndex !== null) {
                currentAddresses[this.editingAddressIndex] = newAddr;
            } else {
                currentAddresses.push(newAddr);
            }

            this.updateUser(user._id, { direcciones_entrega: currentAddresses }, 'Dirección guardada correctamente');
        } else {
            this.addressForm.markAllAsTouched();
        }
    }

    deleteAddress(index: number) {
        if (!confirm('¿Estás seguro de eliminar esta dirección?')) return;

        const user = this.authService.user();
        if (!user?._id) return;

        const currentAddresses = [...(user.direcciones_entrega || [])];
        currentAddresses.splice(index, 1);

        this.isLoading = true;
        this.updateUser(user._id, { direcciones_entrega: currentAddresses }, 'Dirección eliminada');
    }

    // --- Shared ---
    private updateUser(id: string, data: any, successMsg: string) {
        this.authService.updateProfile(id, data).subscribe({
            next: () => {
                this.isLoading = false;
                this.isEditing = false;
                this.showAddressForm = false;
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
