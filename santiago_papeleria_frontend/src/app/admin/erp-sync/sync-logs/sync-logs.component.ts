import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpService, SyncLog } from '../../../services/erp/erp.service';

@Component({
    selector: 'app-sync-logs',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './sync-logs.component.html',
})
export class SyncLogsComponent implements OnInit {
    private erpService = inject(ErpService);

    logs = signal<SyncLog[]>([]);
    filteredLogs = signal<SyncLog[]>([]);

    selectedLog = signal<SyncLog | null>(null);

    // Filters
    statusFilter = signal<string>('all');
    typeFilter = signal<string>('all');
    searchTerm = signal('');
    dateFrom = signal('2025-12-01');
    dateTo = signal('2025-12-11');

    ngOnInit() {
        this.erpService.getSyncLogs().subscribe((data: any[]) => {
            this.logs.set(data);
            this.applyFilters();
        });
    }

    applyFilters() {
        const status = this.statusFilter();
        const type = this.typeFilter();
        const search = this.searchTerm().toLowerCase();

        const result = this.logs().filter(log => {
            const matchesStatus = status === 'all' || log.status === status;
            const matchesType = type === 'all' || log.type === type;
            const matchesSearch = search === '' ||
                log.id.toLowerCase().includes(search) ||
                log.initiator.toLowerCase().includes(search);
            return matchesStatus && matchesType && matchesSearch;
        });
        this.filteredLogs.set(result);
    }

    openModal(log: SyncLog) {
        this.selectedLog.set(log);
    }

    closeModal() {
        this.selectedLog.set(null);
    }

    downloadLog(log: SyncLog) {
        const content = `Sync Log - ${log.id}\n` +
            `Fecha: ${log.timestamp}\n` +
            `Tipo: ${log.type}\n` +
            `Iniciado por: ${log.initiator}\n` +
            `Duración: ${log.duration}\n` +
            `Estado: ${log.status}\n\n` +
            `Log detallado:\n${log.detailLog}`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sync-log-${log.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportLogs() {
        const logs = this.filteredLogs();
        if (logs.length === 0) return;

        // CSV Header
        const headers = ['ID', 'Fecha', 'Tipo', 'Iniciado Por', 'Duración', 'Estado', 'Productos Actualizados', 'Errores'];

        // CSV Rows
        const rows = logs.map(log => [
            log.id,
            log.timestamp,
            log.type === 'automatic' ? 'Automática' : 'Manual',
            log.initiator,
            log.duration,
            log.status,
            log.productsUpdated.toString(),
            log.errors.toString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'santiago_papeleria_sync_logs.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'success': return 'bg-green-100 text-green-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'error': return 'bg-red-100 text-red-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            default: return '';
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'success': return 'ri-check-line';
            case 'warning': return 'ri-alert-line';
            case 'error': return 'ri-close-line';
            case 'in_progress': return 'ri-loader-line animate-spin';
            default: return '';
        }
    }

    getTypeLabel(type: string): string {
        return type === 'automatic' ? 'Automática' : 'Manual';
    }
}
