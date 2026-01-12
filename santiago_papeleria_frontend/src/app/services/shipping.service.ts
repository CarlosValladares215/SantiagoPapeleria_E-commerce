import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ShippingConfig {
    baseRate: number;
    ratePerKm: number;
    ratePerKg: number;
    ivaRate: number;
    isActive: boolean;
    freeShippingThreshold?: number; // Optional until backend fully propagated or default 0
}

export interface ShippingZone {
    _id?: string;
    name: string;
    provinces: string[];
    active: boolean;
}

export interface ShippingRate {
    _id?: string;
    zone_id: string;
    min_weight: number;
    max_weight: number;
    price: number;
    active: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ShippingService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl.replace('/productos', '') + '/shipping';

    // Config
    getConfig(): Observable<ShippingConfig> {
        return this.http.get<ShippingConfig>(`${this.apiUrl}/config`);
    }

    updateConfig(config: Partial<ShippingConfig>): Observable<ShippingConfig> {
        return this.http.put<ShippingConfig>(`${this.apiUrl}/config`, config);
    }

    // Zones
    getZones(): Observable<ShippingZone[]> {
        return this.http.get<ShippingZone[]>(`${this.apiUrl}/zones`);
    }

    createZone(zone: Partial<ShippingZone>): Observable<ShippingZone> {
        return this.http.post<ShippingZone>(`${this.apiUrl}/zones`, zone);
    }

    updateZone(id: string, zone: Partial<ShippingZone>): Observable<ShippingZone> {
        return this.http.put<ShippingZone>(`${this.apiUrl}/zones/${id}`, zone);
    }

    deleteZone(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/zones/${id}`);
    }

    // Rates
    getRates(zoneId: string): Observable<ShippingRate[]> {
        return this.http.get<ShippingRate[]>(`${this.apiUrl}/zones/${zoneId}/rates`);
    }

    createRate(zoneId: string, data: Partial<ShippingRate>): Observable<ShippingRate> {
        return this.http.post<ShippingRate>(`${this.apiUrl}/zones/${zoneId}/rates`, data);
    }

    updateRate(rateId: string, data: Partial<ShippingRate>): Observable<ShippingRate> {
        return this.http.put<ShippingRate>(`${this.apiUrl}/rates/${rateId}`, data);
    }

    deleteRate(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/rates/${id}`);
    }

    // Import
    importExcel(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.apiUrl}/import`, formData);
    }

    // Calculate
    calculateShipping(province: string, weight: number): Observable<{ cost: number }> {
        return this.http.post<{ cost: number }>(`${this.apiUrl}/calculate`, { province, weight });
    }
}
