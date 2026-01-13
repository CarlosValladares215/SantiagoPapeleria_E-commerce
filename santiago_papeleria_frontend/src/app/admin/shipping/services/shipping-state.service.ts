import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { ShippingService, ShippingConfig, ShippingZone, ShippingRate, ShippingCity } from '../../../services/shipping.service';
import { ToastService } from '../../../services/toast.service';
import { forkJoin, finalize, tap, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ShippingStateService {
    public shippingService = inject(ShippingService);
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
    cities = signal<ShippingCity[]>([]);
    allRates = signal<ShippingRate[]>([]);

    // Selection State
    selectedZone = signal<ShippingZone | null>(null);

    // UI State
    isLoading = signal(false);
    isSaving = signal(false);

    // Derived State
    ivaPercentage = computed(() => Math.round(this.config().ivaRate * 100));

    constructor() {
        // Removed auto-load to allow components to control lifecycle
    }

    loadAll() {
        console.log('ShippingStateService: loadAll started');
        this.isLoading.set(true);
        forkJoin({
            config: this.shippingService.getConfig(),
            zones: this.shippingService.getZones(),
            cities: this.shippingService.getCities(),
            allRates: this.shippingService.getAllRates()
        }).pipe(
            finalize(() => {
                // Use setTimeout to ensure we run after current microtask queue and force CD
                setTimeout(() => {
                    console.log('ShippingStateService: loadAll finalized');
                    this.isLoading.set(false);
                }, 0);
            })
        ).subscribe({
            next: ({ config, zones, cities, allRates }: { config: ShippingConfig, zones: ShippingZone[], cities: ShippingCity[], allRates: ShippingRate[] }) => {
                console.log('ShippingStateService: data received', { config, zones, cities, allRates });
                this.config.set(config);
                this.zones.set(zones);
                console.log(`[ShippingState] Setting cities signal with ${cities.length} items`);
                this.cities.set(cities);
                this.allRates.set(allRates);
                // If there was a selected zone, try to refresh it or clear it
                if (this.selectedZone()) {
                    const updatedZone = zones.find((z: ShippingZone) => z._id === this.selectedZone()!._id);
                    this.selectedZone.set(updatedZone || null);
                    if (updatedZone?._id) {
                        this.loadRates(updatedZone._id).subscribe();
                    }
                }
            },
            error: (err: any) => {
                console.error('ShippingStateService: error', err);
                this.toastService.error('Error cargando datos de envío');
            }
        });
    }

    loadAllRates() {
        this.shippingService.getAllRates().subscribe({
            next: (rates) => this.allRates.set(rates),
            error: () => console.error('Error auto-refreshing global rates')
        });
    }

    loadRates(zoneId: string) {
        return this.shippingService.getRates(zoneId).pipe(
            tap({
                next: (rates: ShippingRate[]) => this.rates.set(rates),
                error: (err: any) => this.toastService.error('Error cargando tarifas')
            })
        );
    }

    selectZone(zone: ShippingZone) {
        this.selectedZone.set(zone);
        if (zone._id) {
            return this.loadRates(zone._id);
        } else {
            this.rates.set([]);
            // Return empty observable for consistency
            return new Observable<ShippingRate[]>(observer => {
                observer.next([]);
                observer.complete();
            });
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
                setTimeout(() => this.isSaving.set(false), 0);
            })
        );
    }

    refreshZones() {
        this.shippingService.getZones().subscribe({
            next: (zones: ShippingZone[]) => {
                this.zones.set(zones);
                // Update selectedZone reference if it exists
                if (this.selectedZone()) {
                    const currentId = this.selectedZone()!._id;
                    const updated = zones.find(z => z._id === currentId);
                    if (updated) this.selectedZone.set(updated);
                }
            },
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

    updateZone(id: string, data: Partial<ShippingZone>) {
        this.shippingService.updateZone(id, data).subscribe({
            next: () => {
                this.refreshZones(); // Reflect changes locally if needed
                this.toastService.success('Zona actualizada');
            },
            error: () => this.toastService.error('Error actualizando zona')
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
                this.loadRates(zoneId).subscribe();
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
                if (zoneId) this.loadRates(zoneId).subscribe();
                this.toastService.success('Tarifa eliminada');
            },
            error: () => this.toastService.error('Error al eliminar tarifa')
        });
    }

    // --- CITIES STATE ---
    loadCities() {
        return this.shippingService.getCities().pipe(
            tap({
                next: (cities) => this.cities.set(cities),
                error: () => this.toastService.error('Error cargando ciudades')
            })
        );
    }

    createCity(city: Partial<ShippingCity>) {
        this.shippingService.createCity(city).subscribe({
            next: () => {
                this.loadCities().subscribe();
                this.toastService.success('Ciudad agregada');
            },
            error: () => this.toastService.error('Error creando ciudad')
        });
    }

    updateCity(id: string, city: Partial<ShippingCity>) {
        this.shippingService.updateCity(id, city).subscribe({
            next: () => {
                this.loadCities().subscribe();
                this.toastService.success('Ciudad actualizada');
            },
            error: () => this.toastService.error('Error actualizando ciudad')
        });
    }

    deleteCity(id: string) {
        if (!confirm('¿Eliminar ciudad?')) return;
        this.shippingService.deleteCity(id).subscribe({
            next: () => {
                this.loadCities().subscribe();
                this.toastService.success('Ciudad eliminada');
            },
            error: () => this.toastService.error('Error eliminando ciudad')
        });
    }
}
