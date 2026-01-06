import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Promocion } from '../models/promocion.model';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class PromocionesService {
    private apiUrl = `${environment.baseApiUrl}/promociones`;

    constructor(private http: HttpClient) { }

    getAll(filters?: any): Observable<Promocion[]> {
        let params = new HttpParams();
        if (filters) {
            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== undefined) {
                    params = params.set(key, filters[key]);
                }
            });
        }
        return this.http.get<Promocion[]>(this.apiUrl, { params });
    }

    getById(id: string): Observable<Promocion> {
        return this.http.get<Promocion>(`${this.apiUrl}/${id}`);
    }

    create(promocion: Promocion): Observable<Promocion> {
        return this.http.post<Promocion>(this.apiUrl, promocion);
    }

    update(id: string, promocion: Partial<Promocion>): Observable<Promocion> {
        return this.http.patch<Promocion>(`${this.apiUrl}/${id}`, promocion);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
