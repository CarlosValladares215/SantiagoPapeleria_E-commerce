import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpService, SyncLog } from '../../../../services/erp.service';

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
        this.erpService.getSyncLogs().subscribe(data => {
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
