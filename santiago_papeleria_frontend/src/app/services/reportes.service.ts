import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
    ingresos: { value: number; change: number };
    pedidos: { value: number; change: number };
    ticketPromedio: { value: number; change: number };
    salesTrend: { labels: string[], data: number[] };
    lastUpdate: Date;
}

export interface TopProduct {
    _id: string;
    nombre: string;
    unidades: number;
    ingresos: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReportesService {
    private apiUrl = `${environment.baseApiUrl}/reportes`;

    constructor(private http: HttpClient) { }

    getDashboardStats(fecha: string = 'hoy'): Observable<DashboardStats> {
        const params = new HttpParams().set('fecha', fecha);
        return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`, { params });
    }

    getTopProducts(limit: number = 10, categoria?: string): Observable<TopProduct[]> {
        let params = new HttpParams().set('limit', limit.toString());
        if (categoria) {
            params = params.set('categoria', categoria);
        }
        return this.http.get<TopProduct[]>(`${this.apiUrl}/productos-mas-vendidos`, { params });
    }

    getRecentOrders(limit: number = 20): Observable<any[]> {
        const params = new HttpParams().set('limit', limit.toString());
        return this.http.get<any[]>(`${this.apiUrl}/recent-orders`, { params });
    }

    exportReport(format: 'pdf' | 'excel', params: any): Observable<Blob> {
        return this.http.post(`${this.apiUrl}/exportar`, { format, ...params }, { responseType: 'blob' });
    }
}
