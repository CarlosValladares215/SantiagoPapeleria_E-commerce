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
    items: OrderItem[];
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
    private apiUrl = 'http://localhost:3000/api/pedidos';

    orders = signal<Order[]>([]);

    getOrders(): Observable<Order[]> {
        return this.http.get<Order[]>(this.apiUrl);
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

    cancelOrder(id: string, userId: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/${id}/cancel`, { userId });
    }
}
