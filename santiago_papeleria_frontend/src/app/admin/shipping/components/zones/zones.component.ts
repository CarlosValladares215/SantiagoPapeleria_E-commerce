import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
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
        this.state.selectZone(zone).subscribe((rates) => {
            this.updateNextRateDefaults(rates);
        });
    }

    private updateNextRateDefaults(rates: ShippingRate[]) {
        if (!rates || rates.length === 0) {
            this.newRateMin.set(0);
            this.newRateMax.set(1);
            this.newRatePrice.set(0);
            return;
        }

        // Find the highest max_weight
        const maxWeight = Math.max(...rates.map(r => r.max_weight));
        this.newRateMin.set(maxWeight);
        this.newRateMax.set(maxWeight + 1);
        this.newRatePrice.set(0);
    }

    // Validation Helpers
    private validateOverlap(currentRates: ShippingRate[], newRate: { min: number, max: number }): ShippingRate | undefined {
        return currentRates.find(r =>
            (newRate.min >= r.min_weight && newRate.min < r.max_weight) ||
            (newRate.max > r.min_weight && newRate.max <= r.max_weight) ||
            (newRate.min <= r.min_weight && newRate.max >= r.max_weight)
        );
    }

    private validatePriceConsistency(currentRates: ShippingRate[], newRate: { min: number, max: number, price: number }): string | null {
        const heavierCheaper = currentRates.find(r => r.min_weight >= newRate.max && r.price < newRate.price);
        if (heavierCheaper) {
            return `Advertencia: Estás cobrando $${newRate.price} por este peso, pero un paquete más pesado (${heavierCheaper.min_weight}-${heavierCheaper.max_weight}kg) cuesta menos ($${heavierCheaper.price}).`;
        }

        const lighterExpensive = currentRates.find(r => r.max_weight <= newRate.min && r.price > newRate.price);
        if (lighterExpensive) {
            return `Advertencia: Estás cobrando $${newRate.price} por este peso, pero un paquete más liviano (${lighterExpensive.min_weight}-${lighterExpensive.max_weight}kg) cuesta más ($${lighterExpensive.price}).`;
        }
        return null;
    }

    private findGap(currentRates: ShippingRate[], newRate: { min: number, max: number }): number | null {
        if (currentRates.length === 0) return null;

        const sorted = [...currentRates].sort((a, b) => a.max_weight - b.max_weight);

        // Find rate that should effectively precede this one (max_weight <= newMin)
        const ratesBelow = sorted.filter(r => r.max_weight <= newRate.min);

        if (ratesBelow.length > 0) {
            const lastMax = ratesBelow[ratesBelow.length - 1].max_weight;
            if (lastMax < newRate.min) {
                return lastMax; // Gap exists between lastMax and newRate.min
            }
        }
        // Check gap "after" if we shrunk the max
        const ratesAbove = sorted.filter(r => r.min_weight >= newRate.max);
        if (ratesAbove.length > 0) {
            const firstMin = ratesAbove[0].min_weight;
            if (newRate.max < firstMin) {
                return newRate.max;
            }
        }

        return null;
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

        const currentRates = this.state.rates();

        // 1. Overlap Validation
        const overlap = this.validateOverlap(currentRates, { min, max });
        if (overlap) {
            this.toastService.error(`Conflicto: Ya existe una tarifa para ${overlap.min_weight}-${overlap.max_weight} kg`);
            return;
        }

        // 2. Gap Validation
        const gapStart = this.findGap(currentRates, { min, max });
        if (gapStart !== null) {
            if (!confirm(`Advertencia: Se detectó un posible "hueco" de cobertura (alrededor de ${gapStart}kg). ¿Continuar?`)) return;
        }

        // 3. Price Consistency Validation
        const warning = this.validatePriceConsistency(currentRates, { min, max, price });
        if (warning) {
            if (!confirm(warning + ' ¿Continuar?')) return;
        }

        this.state.createRate(z._id, {
            min_weight: min,
            max_weight: max,
            price: price,
            active: true
        });

        this.newRateMin.set(max);
        this.newRateMax.set(max + 1);
        this.newRatePrice.set(0);
    }

    updateRate(rate: ShippingRate) {
        if (!rate._id) return;

        const revert = () => {
            const z = this.state.selectedZone();
            if (z?._id) this.state.loadRates(z._id).subscribe();
        };

        if (rate.price < 0 || rate.min_weight < 0 || rate.max_weight < 0) {
            this.toastService.error('No se permiten valores negativos');
            revert();
            return;
        }

        if (rate.min_weight >= rate.max_weight) {
            this.toastService.error('El peso mínimo debe ser menor al máximo');
            revert();
            return;
        }

        const otherRates = this.state.rates().filter(r => r._id !== rate._id);

        // 1. Overlap Check
        const overlap = this.validateOverlap(otherRates, { min: rate.min_weight, max: rate.max_weight });
        if (overlap) {
            this.toastService.error(`Error: Conflicto con tarifa ${overlap.min_weight}-${overlap.max_weight} kg. No se permiten superposiciones.`);
            revert();
            return;
        }

        // 2. Gap Check
        const gapStart = this.findGap(otherRates, { min: rate.min_weight, max: rate.max_weight });
        if (gapStart !== null) {
            if (!confirm(`Advertencia: Esta edición genera un hueco de cobertura cerca de ${gapStart}kg. ¿Estás seguro?`)) {
                revert();
                return;
            }
        }

        // 3. Price Check
        const warning = this.validatePriceConsistency(otherRates, {
            min: rate.min_weight,
            max: rate.max_weight,
            price: rate.price
        });

        if (warning) {
            if (!confirm(warning + ' ¿Guardar cambio?')) {
                revert();
                return;
            }
        }

        this.state.updateRate(rate);
    }

    formatNewRatePrice() {
        this.newRatePrice.update(v => Number(Number(v).toFixed(2)));
    }

    formatRatePrice(rate: ShippingRate) {
        rate.price = Number(Number(rate.price).toFixed(2));
    }

    deleteRate(id?: string) {
        if (!id) return;
        this.state.deleteRate(id);
    }

    // Zone Management
    updateZoneSettings(zone?: ShippingZone) {
        const z = zone || this.state.selectedZone();
        if (!z || !z._id) return;

        this.state.updateZone(z._id, {
            multiplier: z.multiplier,
            active: z.active
        });
    }

    preventSymbols(event: KeyboardEvent) {
        if (['+', '-', 'e', 'E'].includes(event.key)) {
            event.preventDefault();
        }
    }
}
