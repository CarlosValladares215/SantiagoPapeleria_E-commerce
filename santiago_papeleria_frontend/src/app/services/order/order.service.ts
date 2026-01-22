import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface OrderItem {
    codigo_dobranet: string;
    nombre: string;
    cantidad: number;
    precio_unitario_aplicado: number;
    subtotal: number;
    impuesto_iva: number;
}

export interface Order {
    _id: string;
    numero_pedido_web: number;
    usuario_id: any; // Specify type if User interface available
    estado_pedido: string;
    estado_devolucion?: string; // Added for return handling
    items: OrderItem[];
    estado_pago: string;
    resumen_financiero: {
        subtotal_sin_impuestos: number;
        total_impuestos: number;
        costo_envio: number;
        total_pagado: number;
        metodo_pago: string;
        comprobante_pago?: string;
    };
    datos_envio: {
        courier: string;
        guia_tracking: string;
        direccion_destino: {
            calle: string;
            ciudad: string;
            provincia?: string;
            codigo_postal?: string;
            referencia?: string;
        };
    };
    datos_devolucion?: {
        motivo: string;
        fecha_solicitud: string; // ISO Date string
        items: any[];
        estado: 'PENDIENTE_REVISION' | 'APROBADA' | 'RECHAZADA';
        observaciones_bodega?: string;
    };
    integracion_dobranet: {
        sincronizado: boolean;
        intentos: number;
        fecha_sincronizacion: Date;
    };
    fecha_compra: Date;
}

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.baseApiUrl}/pedidos`;

    orders = signal<Order[]>([]);

    getOrders(): Observable<Order[]> {
        return this.http.get<Order[]>(`${this.apiUrl}?t=${Date.now()}`);
    }

    getOrdersByUser(userId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`);
    }

    getOrderById(id: string, userId?: string): Observable<Order> {
        let url = `${this.apiUrl}/${id}`;
        if (userId) {
            url += `?userId=${userId}`;
        }
        return this.http.get<Order>(url);
    }

    updateOrderStatus(id: string, status: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${id}/status`, { status });
    }

    cancelOrder(orderId: string, userId: string): Observable<Order> {
        return this.http.patch<Order>(`${this.apiUrl}/${orderId}/cancel`, { userId });
    }

    requestReturn(orderId: string, userId: string, data: any): Observable<Order> {
        return this.http.post<Order>(`${this.apiUrl}/${orderId}/return`, { userId, ...data });
    }

    validateReturn(orderId: string, decision: 'APPROVE' | 'REJECT', observations: string): Observable<Order> {
        return this.http.post<Order>(`${this.apiUrl}/${orderId}/return/validate`, { decision, observations });
    }
}
