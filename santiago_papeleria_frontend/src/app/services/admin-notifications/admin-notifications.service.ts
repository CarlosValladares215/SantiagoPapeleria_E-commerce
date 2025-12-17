import { Injectable, inject, signal } from '@angular/core';
import { ErpService } from '../erp/erp.service';
import { map, tap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link?: string;
}

@Injectable({
    providedIn: 'root'
})
export class AdminNotificationsService {
    private erpService = inject(ErpService);

    notifications = signal<Notification[]>([]);

    private readonly STORAGE_KEY = 'admin_notifications_read';
    private readIds: Set<string> = new Set();

    constructor() {
        this.loadReadState();
    }

    async fetchNotifications() {
        try {
            const logs = await firstValueFrom(this.erpService.getSyncLogs(20));

            const newNotifications: Notification[] = logs.map(log => {
                let type: Notification['type'] = 'info';
                let title = 'Sincronización ERP';
                let link = '/admin/erp-sync/logs';

                switch (log.status) {
                    case 'success':
                        type = 'success';
                        title = 'Sincronización Exitosa';
                        break;
                    case 'error':
                        type = 'error';
                        title = 'Error de Sincronización';
                        break;
                    case 'warning':
                    case 'partial':
                        type = 'warning';
                        title = 'Advertencia de Sincronización';
                        break;
                }

                return {
                    id: log.id,
                    type,
                    title,
                    message: log.type === 'manual'
                        ? `Manual: ${log.productsUpdated} actualizados, ${log.errors} errores`
                        : `Automática: ${log.productsUpdated} actualizados`,
                    timestamp: new Date(log.timestamp).toLocaleString(), // Simple formatting
                    read: this.readIds.has(log.id),
                    link
                };
            });

            this.notifications.set(newNotifications);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    }

    markAsRead(id: string) {
        this.notifications.update(list =>
            list.map(n => n.id === id ? { ...n, read: true } : n)
        );
        this.readIds.add(id);
        this.saveReadState();
    }

    markAllAsRead() {
        this.notifications.update(list => {
            list.forEach(n => this.readIds.add(n.id));
            return list.map(n => ({ ...n, read: true }));
        });
        this.saveReadState();
    }

    clearAll() {
        // Just clear from view, or maybe we want to mark all as read?
        // Requirement implies "Eliminar", but we can't delete logs. 
        // For now, let's just empty the list in the UI, but they might reappear on refresh if we don't store "deleted" state.
        // Better implementation for "Clear": Mark all as read and maybe hide them? 
        // Let's just empty the signal for the intuitive "Clear" behavior, knowing they come back on refresh if we fetch again.
        // Actually, let's just mark them read.
        this.notifications.set([]);
    }

    private loadReadState() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            try {
                this.readIds = new Set(JSON.parse(saved));
            } catch {
                this.readIds = new Set();
            }
        }
    }

    private saveReadState() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.readIds)));
    }
}
