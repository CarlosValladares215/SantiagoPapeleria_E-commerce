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

    getTopProducts(fecha: string = 'hoy', limit: number = 10): Observable<TopProduct[]> {
        let params = new HttpParams()
            .set('fecha', fecha)
            .set('limit', limit.toString());
        return this.http.get<TopProduct[]>(`${this.apiUrl}/productos-mas-vendidos`, { params });
    }

    getRecentOrders(page: number = 1, limit: number = 20, status?: string, customerType?: string, paymentStatus?: string): Observable<{ data: any[], total: number, totalPages: number }> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (status && status !== 'Todos') params = params.set('status', status);
        if (paymentStatus && paymentStatus !== 'Todos') params = params.set('paymentStatus', paymentStatus);
        if (customerType && customerType !== 'Todos') params = params.set('customerType', customerType);

        return this.http.get<{ data: any[], total: number, totalPages: number }>(`${this.apiUrl}/recent-orders`, { params });
    }

    exportReport(format: 'pdf' | 'excel', params: any): Observable<Blob> {
        return this.http.post(`${this.apiUrl}/exportar`, { format, ...params }, { responseType: 'blob' });
    }

    updateOrderPaymentStatus(orderId: string, status: string): Observable<any> {
        // We use the generic status endpoint which maps to specific update logic in backend
        return this.http.patch(`${this.apiUrl.replace('/reportes', '/pedidos')}/${orderId}/status`, { status });
    }

    receiveReturnedOrder(orderId: string, observations: string = ''): Observable<any> {
        return this.http.patch(`${this.apiUrl.replace('/reportes', '/pedidos')}/${orderId}/return/receive`, { observations });
    }

    finalizeReturnedOrder(orderId: string): Observable<any> {
        return this.http.patch(`${this.apiUrl.replace('/reportes', '/pedidos')}/${orderId}/return/finalize`, {});
    }

    validateReturnOrder(orderId: string, decision: 'APPROVE' | 'REJECT', observations: string = ''): Observable<any> {
        return this.http.post(`${this.apiUrl.replace('/reportes', '/pedidos')}/${orderId}/return/validate`, { decision, observations });
    }
}
