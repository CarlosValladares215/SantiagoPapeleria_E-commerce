import { Component, inject, signal, computed, OnInit, ChangeDetectorRef, NgZone, ChangeDetectionStrategy, ApplicationRef } from '@angular/core'; // ✅ NgZone e Inyectores
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Settings, Map, Upload, Save, MapPin, Check, Trash2, X, Plus, UploadCloud, FileSpreadsheet } from 'lucide-angular';
import { ShippingService, ShippingConfig, ShippingZone, ShippingRate } from '../../../services/shipping.service';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators'; // ✅ Importante para asegurar que loading se apague

const PROVINCES_MAP = {
    COSTA: ['Esmeraldas', 'Manabí', 'Santa Elena', 'Guayas', 'El Oro', 'Los Ríos', 'Santo Domingo'],
    SIERRA: ['Carchi', 'Imbabura', 'Pichincha', 'Cotopaxi', 'Tungurahua', 'Bolívar', 'Chimborazo', 'Cañar', 'Azuay', 'Loja'],
    ORIENTE: ['Sucumbíos', 'Napo', 'Orellana', 'Pastaza', 'Morona Santiago', 'Zamora Chinchipe'],
    INSULAR: ['Galápagos']
};

@Component({
    selector: 'app-shipping-config',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    providers: [
        { provide: LucideAngularModule, useValue: LucideAngularModule.pick({ Settings, Map, Upload, Save, MapPin, Check, Trash2, X, Plus, UploadCloud, FileSpreadsheet }) }
    ],
    templateUrl: './shipping-config.component.html',
    styleUrl: './shipping-config.component.scss',
    changeDetection: ChangeDetectionStrategy.Default // ✅ Aseguramos estrategia por defecto para máxima reactividad
})
export class ShippingConfigComponent implements OnInit {
    private shippingService = inject(ShippingService);
    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone); // ✅ FIX: Usar NgZone para despertar la UI tras procesos asíncronos
    private appRef = inject(ApplicationRef);

    regions = PROVINCES_MAP;
    regionKeys = Object.keys(PROVINCES_MAP) as Array<keyof typeof PROVINCES_MAP>;

    currentTab = signal<'general' | 'zones' | 'import'>('general');
    config = signal<ShippingConfig>({ baseRate: 0, ratePerKm: 0, ratePerKg: 0, ivaRate: 0.15, isActive: true, freeShippingThreshold: 0 });

    // UX: IVA en porcentaje (15 en vez de 0.15)
    ivaPercentage = computed(() => Math.round(this.config().ivaRate * 100));

    updateIvaPercentage(val: number) {
        const numericVal = Number(val);
        if (!isNaN(numericVal) && numericVal >= 0) {
            this.updateConfigField('ivaRate', numericVal / 100);
        }
    }

    zones = signal<ShippingZone[]>([]);
    rates = signal<ShippingRate[]>([]);

    selectedZone = signal<ShippingZone | null>(null);
    selectedProvinces = signal<Set<string>>(new Set());

    isLoading = signal(false);
    isSaving = signal(false);
    toast = signal<{ msg: string, type: 'success' | 'error' } | null>(null);

    newZoneName = signal('');
    newRateMin = signal(0);
    newRateMax = signal(5);
    newRatePrice = signal(0);

    ngOnInit() {
        this.loadData();
    }

    switchTab(tab: 'general' | 'zones' | 'import') {
        this.currentTab.set(tab);
        if (tab !== 'zones') {
            this.selectedProvinces.set(new Set());
            this.newZoneName.set('');
        }
    }

    loadData() {
        this.isLoading.set(true);

        forkJoin({
            config: this.shippingService.getConfig(),
            zones: this.shippingService.getZones()
        }).pipe(
            finalize(() => {
                this.ngZone.run(() => {
                    // Pequeño delay para asegurar que el DOM se prepare para el cambio de @if
                    setTimeout(() => {
                        this.isLoading.set(false);
                        this.cdr.detectChanges();
                        this.cdr.markForCheck();
                        this.appRef.tick(); // Forzamos un ciclo global para despertar todo
                    }, 100); // Aumentamos un poco el delay
                });
            })
        ).subscribe({
            next: ({ config, zones }) => {
                this.ngZone.run(() => {
                    this.config.set(config);
                    this.zones.set(zones);
                    this.cdr.detectChanges();
                });
            },
            error: (err) => {
                console.error(err);
                this.ngZone.run(() => {
                    this.isLoading.set(false);
                    this.showToast('Error al cargar datos', 'error');
                });
            }
        });
    }

    updateConfigField(field: keyof ShippingConfig, value: any) {
        this.config.update(c => ({
            ...c,
            [field]: value
        }));
    }

    loadZones() {
        this.shippingService.getZones().subscribe(data => {
            this.zones.set(data);
            this.cdr.detectChanges(); // ✅ FIX: Forced update
        });
    }

    saveConfig() {
        const p = this.config();

        // ✅ FIX: Validación estricta de límites razonables
        if (p.baseRate < 0 || p.ivaRate < 0 || p.ratePerKg < 0) {
            this.showToast('No se permiten valores negativos', 'error');
            return;
        }
        if (p.ivaRate > 100) {
            this.showToast('El IVA parece demasiado alto. Ingrese un valor como 15 para 15%.', 'error');
            return;
        }

        this.isSaving.set(true);

        // Aseguramos conversión a número
        const payload = {
            baseRate: Math.max(0, Number(p.baseRate)),
            ivaRate: Math.max(0, Number(p.ivaRate)),
            ratePerKg: Math.max(0, Number(p.ratePerKg)),
            ratePerKm: Number(p.ratePerKm || 0),
            freeShippingThreshold: Math.max(0, Number(p.freeShippingThreshold || 0)),
            isActive: true
        };

        this.shippingService.updateConfig(payload).subscribe({
            next: (res) => {
                this.ngZone.run(() => {
                    this.config.set(res);
                    this.isSaving.set(false);
                    this.showToast('Configuración guardada', 'success');
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                this.ngZone.run(() => {
                    this.isSaving.set(false);
                    this.showToast('Error al guardar', 'error');
                    this.cdr.detectChanges();
                });
            }
        });
    }

    selectZone(zone: ShippingZone) {
        this.selectedZone.set(zone);
        if (zone._id) {
            this.loadRates(zone._id);
        }
    }

    toggleProvinceSelection(province: string) {
        const current = new Set(this.selectedProvinces());
        if (current.has(province)) current.delete(province);
        else current.add(province);
        this.selectedProvinces.set(current);
    }

    createZone() {
        if (!this.newZoneName().trim()) { // .trim() evita nombres solo con espacios
            this.showToast('Escribe un nombre para la zona', 'error');
            return;
        }
        const provinces = Array.from(this.selectedProvinces());
        if (provinces.length === 0) {
            this.showToast('Selecciona al menos una provincia', 'error');
            return;
        }

        this.shippingService.createZone({
            name: this.newZoneName(),
            provinces: provinces,
            active: true
        }).subscribe({
            next: () => {
                this.loadZones();
                this.newZoneName.set('');
                this.selectedProvinces.set(new Set());
                this.showToast('Zona creada', 'success');
            },
            error: () => this.showToast('Error creando zona', 'error')
        });
    }

    deleteZone(id?: string) {
        if (!id || !confirm('¿Estás seguro de eliminar esta zona?')) return;
        this.shippingService.deleteZone(id).subscribe(() => {
            this.loadZones();
            this.selectedZone.set(null);
            this.rates.set([]);
            this.showToast('Zona eliminada', 'success');
        });
    }

    // Rate Management
    addRate() {
        const z = this.selectedZone();
        if (!z?._id) return;

        // ✅ FIX: Validaciones lógicas de tarifas
        const min = Number(this.newRateMin());
        const max = Number(this.newRateMax());
        const price = Number(this.newRatePrice());

        if (min < 0 || max < 0 || price < 0) {
            this.showToast('No se permiten valores negativos', 'error');
            return;
        }
        if (min >= max) {
            this.showToast('El peso mínimo debe ser menor al máximo', 'error');
            return;
        }

        const rate = {
            min_weight: min,
            max_weight: max,
            price: price,
            active: true
        };

        this.shippingService.createRate(z._id, rate).subscribe({
            next: () => {
                this.loadRates(z._id!);
                // Auto-incremento inteligente
                this.newRateMin.set(max);
                this.newRateMax.set(max + 5);
                this.newRatePrice.set(0);
                this.showToast('Tarifa agregada', 'success');
            },
            error: () => this.showToast('Error al agregar tarifa', 'error')
        });
    }

    updateRate(rate: ShippingRate) {
        if (!rate._id) return;
        // Validación inline rápida
        if (rate.price < 0) rate.price = 0;

        this.shippingService.updateRate(rate._id, rate).subscribe({
            next: () => console.log('Rate updated'),
            error: () => this.showToast('Error al actualizar', 'error')
        });
    }

    deleteRate(id?: string) {
        if (!id) return;
        this.shippingService.deleteRate(id).subscribe(() => {
            if (this.selectedZone()?._id) this.loadRates(this.selectedZone()!._id!);
            this.showToast('Tarifa eliminada', 'success');
        });
    }

    loadRates(zoneId: string) {
        this.shippingService.getRates(zoneId).subscribe(r => {
            this.rates.set(r);
            this.cdr.detectChanges(); // ✅ FIX: Forced updated
        });
    }

    onFileSelected(e: any) {
        const file = e.target.files[0];
        if (!file) return;
        this.shippingService.importExcel(file).subscribe({
            next: (res: any) => {
                this.showToast(`Importadas ${res.importedRates} tarifas`, 'success');
                this.loadData(); // Recargar todo para ver cambios
            },
            error: () => this.showToast('Error en importación', 'error')
        });
    }

    showToast(msg: string, type: 'success' | 'error') {
        this.toast.set({ msg, type });
        // Aseguramos que el toast se vea inmediatamente
        this.cdr.detectChanges();
        setTimeout(() => {
            this.toast.set(null);
            this.cdr.detectChanges(); // Aseguramos que se oculte bien
        }, 3000);
    }
}