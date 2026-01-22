import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth/auth.service';
import { MapComponent } from '../../../../shared/components/map/map.component';
import { DireccionEntrega } from '../../../../models/usuario.model';

@Component({
    selector: 'app-address-list',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MapComponent],
    templateUrl: './address-list.html'
})
export class AddressListComponent {
    authService = inject(AuthService);
    fb = inject(FormBuilder);
    http = inject(HttpClient);

    addressForm: FormGroup;
    isAddingAddress = false;
    showAddressForm = false;
    editingAddressIndex: number | null = null;
    isLoading = false;
    successMessage = '';

    provincias = [
        'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas', 'Galápagos',
        'Guayas', 'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza',
        'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsáchilas', 'Sucumbíos', 'Tungurahua', 'Zamora Chinchipe'
    ];

    constructor() {
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
    }

    get addresses(): DireccionEntrega[] {
        return this.authService.user()?.direcciones_entrega || [];
    }

    initNewAddress() {
        this.addressForm.reset();
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
        this.getAddressFromCoords(coords.lat, coords.lng);
    }

    getAddressFromCoords(lat: number, lng: number) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

        this.http.get<any>(url).subscribe({
            next: (data) => {
                if (data && data.address) {
                    const addr = data.address;
                    const road = addr.road || addr.pedestrian || addr.suburb || '';
                    const houseNumber = addr.house_number ? ` ${addr.house_number}` : '';
                    const calle = `${road}${houseNumber}`;
                    const city = addr.city || addr.town || addr.village || addr.county || '';
                    const province = addr.state || addr.region || '';

                    this.addressForm.patchValue({
                        calle_principal: calle,
                        ciudad: city,
                        provincia: this.matchProvince(province)
                    });
                }
            },
            error: (err) => console.error('Geocoding error', err)
        });
    }

    matchProvince(incoming: string): string {
        const found = this.provincias.find(p => p.toLowerCase() === incoming.toLowerCase());
        return found || incoming;
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
                location: { lat: val.lat, lng: val.lng }
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

    private updateUser(id: string, data: any, successMsg: string) {
        this.authService.updateProfile(id, data).subscribe({
            next: () => {
                this.isLoading = false;
                this.showAddressForm = false;
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
