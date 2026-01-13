import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, forkJoin, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SyncLog {
    id: string;
    timestamp: string;
    type: string;
    initiator: string;
    duration: string;
    productsUpdated: number;
    productsNew: number;
    status: 'success' | 'error' | 'warning' | 'partial' | 'in_progress';
    errors: number;
    detailLog?: string;
    errorDetails?: any[];
}

@Injectable({
    providedIn: 'root'
})
export class ErpService {
    private apiUrl = environment.baseApiUrl; // Direct connection to NestJS

    constructor(private http: HttpClient) { }

    // Real backend calls
    testConnection(): Observable<any> {
        return this.http.get(`${this.apiUrl}/erp-sync/test-connection`);
    }

    triggerSync(): Observable<any> {
        return this.http.post(`${this.apiUrl}/erp-sync/sync-now`, {});
    }

    getRawData(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/erp-sync/raw-data`);
    }

    getConfig(): Observable<any> {
        return this.http.get(`${this.apiUrl}/erp-sync/config`);
    }

    saveConfig(config: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/erp-sync/config`, config);
    }


    getDashboardMetrics(): Observable<any> {
        return forkJoin({
            metrics: this.http.get<any>(`${this.apiUrl}/erp-sync/dashboard-metrics`),
            logs: this.http.get<any[]>(`${this.apiUrl}/erp-sync/logs?limit=5`)
        }).pipe(
            map(({ metrics, logs }) => {
                // Map backend response to UI structure
                return {
                    status: metrics.lastSync?.status === 'success' ? 'connected' : 'disconnected',
                    lastSync: metrics.lastSync?.date || null,
                    nextSync: metrics.nextSync,
                    erpName: "DobraNet ERP",
                    metrics: {
                        totalProducts: metrics.totalProducts,
                        todayNewProducts: metrics.todayNewProducts || 0,
                        successRate: typeof metrics.successRate === 'number' ? metrics.successRate : parseFloat(metrics.successRate) || 0,
                        lastSyncDuration: metrics.lastSync?.duration || "N/A",
                        pendingErrors: metrics.pendingErrors || 0
                    },
                    recentSyncs: logs.map(log => ({
                        id: log._id,
                        timestamp: log.startTime,
                        type: log.triggeredBy === 'cron' ? 'automatic' : 'manual',
                        initiator: log.triggeredBy === 'cron' ? 'Sistema (Cron)' : 'Manual',
                        duration: log.duration,
                        productsUpdated: log.productsUpdated,
                        productsNew: log.productsCreated,
                        errors: log.errors?.length || 0,
                        status: log.status
                    }))
                };
            })
        );
    }

    getSyncLogs(limit = 50): Observable<SyncLog[]> {
        return this.http.get<any[]>(`${this.apiUrl}/erp-sync/logs?limit=${limit}`).pipe(
            map(logs => logs.map(log => ({
                id: log._id,
                timestamp: log.startTime,
                type: log.triggeredBy === 'cron' ? 'automatic' : 'manual',
                initiator: log.triggeredBy === 'cron' ? 'Sistema (Cron)' : 'Manual',
                duration: log.duration,
                productsUpdated: log.productsUpdated,
                productsNew: log.productsCreated,
                status: log.status,
                errors: log.errors?.length || 0,
                detailLog: JSON.stringify(log, null, 2)
            })))
        );
    }

    // --- Master Product List Methods ---
    getAdminProducts(params: any): Observable<any> {
        return this.http.get(`${this.apiUrl}/productos/admin/search`, { params });
    }

    patchProduct(sku: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/productos/${sku}/enrich`, data);
    }

    uploadImage(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.apiUrl}/productos/upload`, formData);
    }

    syncCategories(): Observable<any> {
        return this.http.post(`${this.apiUrl}/erp-sync/sync-categories`, {});
    }

    getInventoryStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/productos/admin/stats`);
    }

    getRecentMovements(limit = 20): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/productos/admin/last-movements?limit=${limit}`);
    }
}
