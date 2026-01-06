import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ShippingService, ShippingConfig, ShippingZone, ShippingRate } from '../../../services/shipping.service';

const ECUADOR_PROVINCES = [
    'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas',
    'Galápagos', 'Guayas', 'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona Santiago',
    'Napo', 'Orellana', 'Pastaza', 'Pichincha', 'Santa Elena', 'Santo Domingo',
    'Sucumbíos', 'Tungurahua', 'Zamora Chinchipe'
];

@Component({
    selector: 'app-shipping-config',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './shipping-config.component.html',
})
export class ShippingConfigComponent {
    private shippingService = inject(ShippingService);

    // Data
    provincesList = ECUADOR_PROVINCES;

    // Tabs
    currentTab = signal<'general' | 'zones' | 'import'>('general');

    // Config
    config = signal<ShippingConfig>({
        baseRate: 0, ratePerKm: 0, ratePerKg: 0, ivaRate: 0.15, isActive: true
    });

    // Zones & Rates
    zones = signal<ShippingZone[]>([]);
    selectedZone = signal<ShippingZone | null>(null);
    rates = signal<ShippingRate[]>([]);

    // Selection State
    selectedProvinces = signal<Set<string>>(new Set());

    // UI State
    isLoading = signal(false);
    isSaving = signal(false);

    // Forms
    newZoneName = '';

    // New Rate (Inline add)
    newRateMin = 0;
    newRateMax = 0;
    newRatePrice = 0;

    // Toast
    showToastNotification = signal(false);
    toastMessage = signal('');
    toastType = signal<'success' | 'error'>('success');

    constructor() {
        this.loadData();
    }

    loadData() {
        this.isLoading.set(true);
        this.shippingService.getConfig().subscribe({
            next: (data) => { this.config.set(data); this.isLoading.set(false); },
            error: () => this.isLoading.set(false)
        });
        this.loadZones();
    }

    loadZones() {
        this.shippingService.getZones().subscribe((data) => this.zones.set(data));
    }

    saveConfig() {
        this.isSaving.set(true);
        const current = this.config();

        // Normalize
        const normalize = (val: any) => {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'string') return Number(val.replace(',', '.'));
            return Number(val);
        };

        // Strict Payload Construction (Avoid sending extra fields that trigger 400 Bad Request)
        const payload = {
            baseRate: normalize(current.baseRate),
            ivaRate: normalize(current.ivaRate),
            ratePerKm: normalize(current.ratePerKm),
            ratePerKg: normalize(current.ratePerKg),
            isActive: true // Always active for now, or use current.isActive if UI has toggle
        };

        console.log('Saving config payload:', payload);

        if (isNaN(payload.baseRate) || isNaN(payload.ivaRate)) {
            this.isSaving.set(false);
            this.showToast('Valores numéricos inválidos. Revise el formato.', 'error');
            return;
        }

        this.shippingService.updateConfig(payload).subscribe({
            next: (upd) => {
                console.log('Config saved:', upd);
                this.config.set(upd);
                this.isSaving.set(false);
                this.showToast('Configuración guardada correctamente', 'success');
            },
            error: (err) => {
                console.error('Error saving config:', err);
                this.isSaving.set(false);
                const errorMsg = err.error?.message || 'Error al guardar configuración';
                this.showToast(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg, 'error');
            }
        });
    }

    // --- Zones ---
    toggleProvince(province: string) {
        const current = this.selectedProvinces();
        if (current.has(province)) current.delete(province);
        else current.add(province);
        // Force signal update? Set is mutable but signal check ref?
        this.selectedProvinces.set(new Set(current));
    }

    addZone() {
        if (!this.newZoneName) return;
        const provinces = Array.from(this.selectedProvinces());

        this.shippingService.createZone({
            name: this.newZoneName,
            provinces,
            active: true
        }).subscribe(() => {
            this.loadZones();
            this.newZoneName = '';
            this.selectedProvinces.set(new Set());
            this.showToast('Zona creada exitosamente', 'success');
        });
    }

    deleteZone(id: string | undefined) {
        if (!id || !confirm('¿Eliminar esta zona y sus tarifas?')) return;
        this.shippingService.deleteZone(id).subscribe(() => {
            this.loadZones();
            if (this.selectedZone()?._id === id) {
                this.selectedZone.set(null);
                this.rates.set([]);
            }
        });
    }

    selectZone(zone: ShippingZone) {
        this.selectedZone.set(zone);
        if (zone._id) this.loadRates(zone._id);
    }

    // --- Rates ---
    loadRates(zoneId: string) {
        this.shippingService.getRates(zoneId).subscribe((data) => this.rates.set(data));
    }

    addRate() {
        const zone = this.selectedZone();
        if (!zone?._id) return;

        const normalize = (v: any) => typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
        const min = normalize(this.newRateMin);
        const max = normalize(this.newRateMax);
        const price = normalize(this.newRatePrice);

        if (min < 0 || max < 0 || price < 0) {
            this.showToast('Valores negativos no permitidos', 'error');
            return;
        }

        this.shippingService.createRate(zone._id, {
            min_weight: min, max_weight: max, price: price, active: true
        }).subscribe(() => {
            this.loadRates(zone._id!);
            this.newRateMin = max; // Auto-set next min to current max
            this.newRateMax = max + 5;
            this.newRatePrice = 0;
            this.showToast('Tarifa agregada', 'success');
        });
    }

    updateInlineRate(rate: ShippingRate) {
        if (!rate._id) return;
        // Logic to sync update on change
        this.shippingService.updateRate(rate._id, rate).subscribe({
            next: () => console.log('Rate updated'),
            error: () => this.showToast('Error actualizando tarifa', 'error')
        });
    }

    deleteRate(id: string | undefined) {
        if (!id || !confirm('¿Eliminar esta tarifa?')) return;
        this.shippingService.deleteRate(id).subscribe(() => {
            if (this.selectedZone()?._id) this.loadRates(this.selectedZone()!._id!);
            this.showToast('Tarifa eliminada', 'success');
        });
    }

    // --- Import ---
    downloadTemplate() {
        const csv = 'Zone,MinWeight,MaxWeight,Price,Provinces\nEjemplo,0,5,5.50,"Pichincha, Guayas"';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_envios.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.shippingService.importExcel(file).subscribe({
                next: (res: any) => this.showToast(`Importación: ${res.importedRates} tarifas`, 'success'),
                error: () => this.showToast('Error al importar', 'error')
            });
        }
    }

    // --- Utils ---
    showToast(msg: string, type: 'success' | 'error') {
        this.toastMessage.set(msg);
        this.toastType.set(type);
        this.showToastNotification.set(true);
        setTimeout(() => this.showToastNotification.set(false), 3000);
    }
}

