import { Component, inject, OnDestroy } from '@angular/core';
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

    selectedSyncType: SyncType = 'complete';
    syncStatus: SyncStatus = 'idle';
    progress = 0;
    currentStep = 0;
    elapsedTime = 0;
    syncResults: any = null;
    private interval: any;

    progressSteps: ProgressStep[] = [
        { id: '1', label: 'Conectando con DobraNet ERP...', status: 'pending' },
        { id: '2', label: 'Validando credenciales...', status: 'pending' },
        { id: '3', label: 'Descargando catálogo de productos...', status: 'pending' },
        { id: '4', label: 'Validando datos recibidos...', status: 'pending' },
        { id: '5', label: 'Actualizando base de datos local...', status: 'pending' },
        { id: '6', label: 'Generando reporte...', status: 'pending' }
    ];

    steps = [...this.progressSteps.map(s => ({ ...s }))];

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
        this.currentStep = 0;
        this.elapsedTime = 0;

        // Start timer
        this.interval = setInterval(() => {
            this.elapsedTime++;
        }, 1000);

        // Trigger real backend sync if needed, but for now simulate the steps as requested in the port
        // Backend call example: this.erpService.triggerSync().subscribe(...)
        // We will keep the simulation logic to match the React behavior exactly for the UI demo

        const newSteps = [...this.steps];

        for (let i = 0; i < newSteps.length; i++) {
            // Mark step processing
            newSteps[i].status = 'processing';
            this.steps = [...newSteps]; // Update view
            this.currentStep = i;

            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

            // Mark step completed
            newSteps[i].status = 'completed';
            this.steps = [...newSteps];
            this.progress = Math.round(((i + 1) / newSteps.length) * 100);
        }

        if (this.interval) clearInterval(this.interval);

        // Mock results
        this.syncResults = {
            productsUpdated: 1247,
            productsNew: 23,
            productsInactive: 5,
            errors: 3,
            duration: this.formatTime(this.elapsedTime),
            timestamp: new Date().toLocaleString('es-ES')
        };

        this.syncStatus = 'completed';
    }

    cancelSync() {
        this.syncStatus = 'idle';
        this.resetState();
    }

    resetSync() {
        this.syncStatus = 'idle';
        this.syncResults = null;
        this.resetState();
    }

    private resetState() {
        this.progress = 0;
        this.currentStep = 0;
        this.elapsedTime = 0;
        this.steps = [...this.progressSteps.map(s => ({ ...s, status: 'pending' as const }))];
        if (this.interval) clearInterval(this.interval);
    }

    formatTime(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    }
}
