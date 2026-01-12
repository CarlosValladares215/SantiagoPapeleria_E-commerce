import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, MapPin, Check, Trash2, Plus, X } from 'lucide-angular';
import { ShippingStateService } from '../../services/shipping-state.service';
import { ShippingRate, ShippingZone } from '../../../../services/shipping.service';
import { ToastService } from '../../../../services/toast.service';
import { ZoneRegionSelectorComponent } from '../zone-region-selector/zone-region-selector.component';

const PROVINCES_MAP: { [key: string]: string[] } = {
    COSTA: ['Esmeraldas', 'Manabí', 'Santa Elena', 'Guayas', 'El Oro', 'Los Ríos', 'Santo Domingo'],
    SIERRA: ['Carchi', 'Imbabura', 'Pichincha', 'Cotopaxi', 'Tungurahua', 'Bolívar', 'Chimborazo', 'Cañar', 'Azuay', 'Loja'],
    ORIENTE: ['Sucumbíos', 'Napo', 'Orellana', 'Pastaza', 'Morona Santiago', 'Zamora Chinchipe'],
    INSULAR: ['Galápagos']
};

@Component({
    selector: 'app-zones',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule, ZoneRegionSelectorComponent],
    providers: [
        { provide: LucideAngularModule, useValue: LucideAngularModule.pick({ MapPin, Check, Trash2, Plus, X }) }
    ],
    templateUrl: './zones.component.html',
})
export class ZonesComponent {
    state = inject(ShippingStateService);
    private toastService = inject(ToastService);

    regions = PROVINCES_MAP;

    // Local state for forms
    newZoneName = signal('');
    selectedProvinces = signal<Set<string>>(new Set());

    newRateMin = signal(0);
    newRateMax = signal(5);
    newRatePrice = signal(0);

    toggleProvince(province: string) {
        const current = new Set(this.selectedProvinces());
        if (current.has(province)) current.delete(province);
        else current.add(province);
        this.selectedProvinces.set(current);
    }

    createZone() {
        if (!this.newZoneName().trim()) {
            this.toastService.error('Escribe un nombre para la zona');
            return;
        }
        const provinces = Array.from(this.selectedProvinces());
        if (provinces.length === 0) {
            this.toastService.error('Selecciona al menos una provincia');
            return;
        }

        this.state.createZone(this.newZoneName(), provinces);

        // Reset form locally - state service handles data refresh
        this.newZoneName.set('');
        this.selectedProvinces.set(new Set());
    }

    deleteZone(id?: string) {
        if (!id || !confirm('¿Estás seguro de eliminar esta zona?')) return;
        this.state.deleteZone(id);
    }

    selectZone(zone: ShippingZone) {
        this.state.selectZone(zone);
    }

    // Rate Management
    addRate() {
        const z = this.state.selectedZone();
        if (!z?._id) return;

        const min = Number(this.newRateMin());
        const max = Number(this.newRateMax());
        const price = Number(this.newRatePrice());

        if (min < 0 || max < 0 || price < 0) {
            this.toastService.error('No se permiten valores negativos');
            return;
        }
        if (min >= max) {
            this.toastService.error('El peso mínimo debe ser menor al máximo');
            return;
        }

        this.state.createRate(z._id, {
            min_weight: min,
            max_weight: max,
            price: price,
            active: true
        });

        // Auto-increment helpers
        this.newRateMin.set(max);
        this.newRateMax.set(max + 5);
        this.newRatePrice.set(0);
    }

    updateRate(rate: ShippingRate) {
        if (!rate._id) return;
        if (rate.price < 0) {
            rate.price = 0;
            this.toastService.error('El precio no puede ser negativo');
        }
        this.state.updateRate(rate);
    }

    deleteRate(id?: string) {
        if (!id) return;
        this.state.deleteRate(id);
    }
}
