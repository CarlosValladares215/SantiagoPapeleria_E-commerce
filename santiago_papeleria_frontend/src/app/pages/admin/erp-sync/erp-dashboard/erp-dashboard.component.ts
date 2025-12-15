import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ErpService } from '../../../../services/erp.service';

@Component({
    selector: 'app-erp-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './erp-dashboard.component.html',
})
export class ErpDashboardComponent implements OnInit {
    private erpService = inject(ErpService);
    private router = inject(Router);
    private cd = inject(ChangeDetectorRef);

    isSyncing = false;
    dashboardData: any = null;
    loading = true;
    error: string | null = null;

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading = true;
        this.error = null;
        this.cd.markForCheck();

        this.erpService.getDashboardMetrics().subscribe({
            next: (data) => {
                this.dashboardData = data;
                this.loading = false;
                this.cd.markForCheck();
            },
            error: (err) => {
                console.error(err);
                this.error = 'No se pudo cargar la información del dashboard. Por favor verifique su conexión con el servidor ERP.';
                this.loading = false;
                this.cd.markForCheck();
            }
        });
    }

    handleManualSync() {
        this.router.navigate(['/admin/erp-sync/manual']);
    }

    handleViewLogs() {
        this.router.navigate(['/admin/erp-sync/logs']);
    }

    handleConfigureAPI() {
        this.router.navigate(['/admin/erp-sync/config']);
    }

    // Helpers copied from React logic
    formatDate(dateString: string): string {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return "Hace menos de 1 hora";
        if (diffInHours < 24) return `Hace ${diffInHours} horas`;
        return `Hace ${Math.floor(diffInHours / 24)} días`;
    }

    getNextSyncTime(dateString: string): string {
        if (!dateString) return "No programada";
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));

        if (diffInHours > 0) return `En ${diffInHours} horas`;
        return "Próxima sincronización programada";
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case "connected": return "bg-green-100 text-green-800";
            case "disconnected": return "bg-red-100 text-red-800";
            case "syncing": return "bg-yellow-100 text-yellow-800";
            default: return "";
        }
    }
}
