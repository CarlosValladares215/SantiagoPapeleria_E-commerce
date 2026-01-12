import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { ShippingService, ShippingConfig, ShippingZone, ShippingRate } from '../../../services/shipping.service';
import { ToastService } from '../../../services/toast.service';
import { forkJoin, finalize } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ShippingStateService {
    private shippingService = inject(ShippingService);
    private toastService = inject(ToastService);
    private zone = inject(NgZone);

    // State Signals
    config = signal<ShippingConfig>({
        baseRate: 0,
        ratePerKm: 0,
        ratePerKg: 0,
        ivaRate: 0.15,
        isActive: true,
        freeShippingThreshold: 0
    });

    zones = signal<ShippingZone[]>([]);
    rates = signal<ShippingRate[]>([]);

    // Selection State
    selectedZone = signal<ShippingZone | null>(null);

    // UI State
    isLoading = signal(false);
    isSaving = signal(false);

    // Derived State
    ivaPercentage = computed(() => Math.round(this.config().ivaRate * 100));

    constructor() {
        this.loadAll();
    }

    loadAll() {
        this.isLoading.set(true);
        forkJoin({
            config: this.shippingService.getConfig(),
            zones: this.shippingService.getZones()
        }).pipe(
            finalize(() => {
                this.zone.run(() => this.isLoading.set(false));
            })
        ).subscribe({
            next: ({ config, zones }: { config: ShippingConfig, zones: ShippingZone[] }) => {
                this.config.set(config);
                this.zones.set(zones);
                // If there was a selected zone, try to refresh it or clear it
                if (this.selectedZone()) {
                    const updatedZone = zones.find((z: ShippingZone) => z._id === this.selectedZone()!._id);
                    this.selectedZone.set(updatedZone || null);
                    if (updatedZone?._id) {
                        this.loadRates(updatedZone._id);
                    }
                }
            },
            error: (err: any) => this.toastService.error('Error cargando datos de envío')
        });
    }

    loadRates(zoneId: string) {
        this.shippingService.getRates(zoneId).subscribe({
            next: (rates: ShippingRate[]) => this.rates.set(rates),
            error: (err: any) => this.toastService.error('Error cargando tarifas')
        });
    }

    selectZone(zone: ShippingZone) {
        this.selectedZone.set(zone);
        if (zone._id) {
            this.loadRates(zone._id);
        } else {
            this.rates.set([]);
        }
    }

    updateConfig(newConfig: ShippingConfig) {
        this.config.set(newConfig);
    }

    // Action wrappers to keep components clean
    saveConfigWrapper() {
        if (this.isSaving()) return;
        this.isSaving.set(true);
        return this.shippingService.updateConfig(this.config()).pipe(
            finalize(() => {
                this.zone.run(() => this.isSaving.set(false));
            })
        );
    }

    refreshZones() {
        this.shippingService.getZones().subscribe({
            next: (zones: ShippingZone[]) => this.zones.set(zones),
            error: () => this.toastService.error('Error refrescando zonas')
        });
    }

    // Zone Actions
    createZone(name: string, provinces: string[]) {
        this.shippingService.createZone({ name, provinces, active: true }).subscribe({
            next: () => {
                this.refreshZones();
                this.toastService.success('Zona creada correctamente');
            },
            error: () => this.toastService.error('Error al crear la zona')
        });
    }

    deleteZone(id: string) {
        this.shippingService.deleteZone(id).subscribe({
            next: () => {
                this.refreshZones();
                if (this.selectedZone()?._id === id) {
                    this.selectedZone.set(null);
                    this.rates.set([]);
                }
                this.toastService.success('Zona eliminada');
            },
            error: () => this.toastService.error('Error al eliminar zona')
        });
    }

    // Rate Actions
    createRate(zoneId: string, rate: any) {
        this.shippingService.createRate(zoneId, rate).subscribe({
            next: () => {
                this.loadRates(zoneId);
                this.toastService.success('Tarifa guardada');
            },
            error: () => this.toastService.error('Error al guardar tarifa')
        });
    }

    updateRate(rate: ShippingRate) {
        if (!rate._id) return;
        this.shippingService.updateRate(rate._id, rate).subscribe({
            next: () => {
                // Optional: toast or silent success
            },
            error: () => this.toastService.error('Error actualizando tarifa')
        });
    }

    deleteRate(id: string) {
        this.shippingService.deleteRate(id).subscribe({
            next: () => {
                const zoneId = this.selectedZone()?._id;
                if (zoneId) this.loadRates(zoneId);
                this.toastService.success('Tarifa eliminada');
            },
            error: () => this.toastService.error('Error al eliminar tarifa')
        });
    }
}

