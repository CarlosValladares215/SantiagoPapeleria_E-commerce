import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface DailySnapshot {
    totalRevenue: number;
    totalOrders: number;
    avgTicket: number;
}

export interface SalesData {
    _id: string; // Date string YYYY-MM-DD
    totalSales: number;
    orderCount: number;
}

export interface TopProduct {
    _id: string; // SKU/Code
    name: string;
    totalSold: number;
    revenue: number;
}

@Injectable({
    providedIn: 'root'
})
export class ReportsService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/reports`;

    getDailySnapshot(): Observable<DailySnapshot> {
        return this.http.get<DailySnapshot>(`${this.apiUrl}/dashboard/today`);
    }

    getSalesByDateRange(start: string, end: string): Observable<SalesData[]> {
        let params = new HttpParams().set('start', start).set('end', end);
        return this.http.get<SalesData[]>(`${this.apiUrl}/sales/range`, { params });
    }

    getTopSellingProducts(range: string = 'hoy', limit: number = 5): Observable<TopProduct[]> {
        let params = new HttpParams()
            .set('fecha', range)
            .set('limit', limit.toString());
        return this.http.get<TopProduct[]>(`${environment.apiUrl}/reportes/productos-mas-vendidos`, { params });
    }
}
