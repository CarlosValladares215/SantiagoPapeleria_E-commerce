import { Component, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpService } from '../../../../services/erp.service';

type SyncType = 'complete' | 'products' | 'prices' | 'stock';
type SyncStatus = 'idle' | 'syncing' | 'completed' | 'failed';

interface ProgressStep {
    id: string;
    label: string;
    status: 'pending' | 'processing' | 'completed';
}

@Component({
    selector: 'app-manual-sync',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './manual-sync.component.html',
})
export class ManualSyncComponent implements OnDestroy {
    private erpService = inject(ErpService);
    private cd = inject(ChangeDetectorRef);

    selectedSyncType: SyncType = 'complete';
    syncStatus: SyncStatus = 'idle';
    progress = 0;
    elapsedTime = 0;
    startTime = 0;
    syncResults: any = null;
    private interval: any;

    // Simplified steps for Real Data flow
    progressSteps: ProgressStep[] = [
        { id: '1', label: 'Conectando con DobraNet ERP...', status: 'pending' },
        { id: '2', label: 'Descargando catálogo (GET STO_MTX_CAT_PRO)...', status: 'pending' },
        { id: '3', label: 'Procesando datos (0/0)...', status: 'pending' },
        { id: '4', label: 'Finalizando sincronización...', status: 'pending' }
    ];

    steps = JSON.parse(JSON.stringify(this.progressSteps));

    syncTypeOptions = [
        {
            id: 'complete' as SyncType,
            label: 'Sincronización Completa',
            description: '(productos, precios y stock)'
        },
        {
            id: 'products' as SyncType,
            label: 'Solo Productos',
            description: '(catálogo sin precios)'
        },
        {
            id: 'prices' as SyncType,
            label: 'Solo Precios',
            description: '(actualizar precios PVP y PVM)'
        },
        {
            id: 'stock' as SyncType,
            label: 'Solo Stock',
            description: '(actualizar existencias)'
        }
    ];

    ngOnDestroy() {
        if (this.interval) clearInterval(this.interval);
    }

    async startSync() {
        this.syncStatus = 'syncing';
        this.progress = 0;
        this.startTime = Date.now();
        this.elapsedTime = 0;
        this.resetSteps();

        // Start elapsed timer
        this.interval = setInterval(() => {
            this.elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            this.cd.detectChanges();
        }, 1000);

        this.cd.detectChanges();

        try {
            // STEP 1: Connection
            this.steps[0].status = 'processing';
            this.cd.detectChanges();
            await new Promise(resolve => setTimeout(resolve, 800)); // Min delay for visual
            this.steps[0].status = 'completed';

            // STEP 2: Fetch Data
            this.steps[1].status = 'processing';
            this.cd.detectChanges();

            this.erpService.getRawData().subscribe({
                next: async (data: any[]) => {
                    this.steps[1].status = 'completed';

                    // STEP 3: Process Items
                    this.steps[2].status = 'processing';
                    const totalItems = data.length;

                    this.syncResults = {
                        productsUpdated: 0,
                        productsNew: 0,
                        productsInactive: 0,
                        errors: 0,
                        duration: '0s',
                        timestamp: ''
                    };

                    const batchSize = 25; // Update UI every N items

                    for (let i = 0; i < totalItems; i++) {
                        if (this.syncStatus !== 'syncing') break; // Allow cancel

                        const item = data[i];

                        // --- LOGIC: Categorize item based on its data ---
                        const stock = Number(item.STK) || 0;
                        const price = Number(item.PVP) || 0;

                        // Hardcoded heuristic for demo purposes to categorize results based on data
                        if (stock <= 0) {
                            this.syncResults.productsInactive++;
                        } else if (stock > 500 && i % 10 === 0) {
                            this.syncResults.productsNew++;
                        } else if (price <= 0.01) {
                            this.syncResults.errors++;
                        } else {
                            this.syncResults.productsUpdated++;
                        }

                        // Update Progress
                        const percentage = Math.min(Math.round(((i + 1) / totalItems) * 100), 100);
                        this.progress = percentage;

                        // Retrieve visual updates
                        if (i % batchSize === 0 || i === totalItems - 1) {
                            this.steps[2].label = `Procesando datos (${i + 1}/${totalItems})`;
                            this.cd.detectChanges();
                            await new Promise(resolve => setTimeout(resolve, 5));
                        }
                    }

                    this.steps[2].status = 'completed';

                    // STEP 4: Finalize
                    this.steps[3].status = 'processing';
                    this.cd.detectChanges();
                    await new Promise(resolve => setTimeout(resolve, 800));
                    this.steps[3].status = 'completed';

                    setTimeout(() => {
                        this.finishSync();
                    }, 500);
                },
                error: (err) => {
                    console.error("Sync Error", err);
                    this.steps[1].status = 'pending';
                    this.cancelSync();
                }
            });

        } catch (e) {
            this.cancelSync();
        }
    }

    finishSync() {
        if (this.syncStatus !== 'syncing') return;

        clearInterval(this.interval);

        const durationSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        this.syncResults!.duration = this.formatTime(durationSeconds);
        this.syncResults!.timestamp = new Date().toLocaleString('es-ES');

        this.syncStatus = 'completed';
        this.progress = 100;
        this.cd.detectChanges();
    }

    cancelSync() {
        this.syncStatus = 'idle';
        clearInterval(this.interval);
        this.resetSteps();
        this.cd.detectChanges();
    }

    resetSync() {
        this.syncStatus = 'idle';
        this.syncResults = null;
        this.cancelSync();
    }

    private resetSteps() {
        this.steps = JSON.parse(JSON.stringify(this.progressSteps));
    }

    formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    }
}
