import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { OrderService, Order as BackendOrder } from '../../services/order/order.service';

interface ProductItem {
    name: string;
    quantity: number;
    totalPrice: number;
    unitPrice: number;
    image: string;
}

interface Order {
    id: string;
    status: 'Pendiente' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado' | string;
    date: Date;
    itemsCount: number;
    trackingId?: string;
    total: number;
    deliveryDate?: string;
    products: ProductItem[];
}

@Component({
    selector: 'app-orders',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './orders.html',
    styleUrl: './orders.scss'
})
export class Orders implements OnInit {
    authService = inject(AuthService);
    orderService = inject(OrderService);

    activeFilter: string = 'Todos';
    expandedOrderId: string | null = null; // Track expanded order

    orders: Order[] = [];

    filters = [
        { label: 'Todos', count: 0, value: 'Todos' },
        { label: 'Pendientes', count: 0, value: 'Pendiente' },
        { label: 'Preparando', count: 0, value: 'Preparando' },
        { label: 'Enviados', count: 0, value: 'Enviado' },
        { label: 'Entregados', count: 0, value: 'Entregado' },
        { label: 'Cancelados', count: 0, value: 'Cancelado' }
    ];

    ngOnInit() {
        this.loadUserOrders();
    }

    loadUserOrders() {
        const userId = this.authService.user()?._id;
        if (!userId) return;

        this.orderService.getOrdersByUser(userId).subscribe({
            next: (data) => {
                this.orders = data.map(order => this.mapBackendOrder(order));
                this.updateFilters();
            },
            error: (err) => console.error('Error fetching user orders', err)
        });
    }

    mapBackendOrder(backendOrder: BackendOrder): Order {
        return {
            id: `ORD-WEB-${backendOrder.numero_pedido_web}`,
            status: this.mapStatus(backendOrder.estado_pedido),
            date: new Date(backendOrder.fecha_compra),
            itemsCount: backendOrder.items.length,
            trackingId: backendOrder.datos_envio?.guia_tracking,
            total: backendOrder.resumen_financiero.total_pagado,
            deliveryDate: backendOrder.estado_pedido === 'ENTREGADO' ? 'Entregado' : 'Por confirmar',
            products: backendOrder.items.map(item => ({
                name: item.nombre,
                quantity: item.cantidad,
                totalPrice: item.subtotal,
                unitPrice: item.precio_unitario_aplicado,
                image: 'assets/products/placeholder.png' // Default image or fetch from product details if needed
            }))
        };
    }

    mapStatus(backendStatus: string): string {
        const statusMap: { [key: string]: string } = {
            'PAGADO': 'Pendiente', // Consolidated
            'PENDIENTE': 'Pendiente',
            'PENDIENTE_PAGO': 'Pendiente',
            'EN_PREPARACION': 'Preparando',
            'PREPARANDO': 'Preparando',
            'ENVIADO': 'Enviado',
            'ENTREGADO': 'Entregado',
            'CANCELADO': 'Cancelado'
        };
        return statusMap[backendStatus] || backendStatus;
    }

    updateFilters() {
        const allCount = this.orders.length;
        const pendingCount = this.orders.filter(o => o.status === 'Pendiente').length;
        const preparingCount = this.orders.filter(o => o.status === 'Preparando').length;
        const sentCount = this.orders.filter(o => o.status === 'Enviado').length;
        const deliveredCount = this.orders.filter(o => o.status === 'Entregado').length;
        const cancelledCount = this.orders.filter(o => o.status === 'Cancelado').length;

        this.filters = [
            { label: 'Todos', count: allCount, value: 'Todos' },
            { label: 'Pendientes', count: pendingCount, value: 'Pendiente' },
            { label: 'Preparando', count: preparingCount, value: 'Preparando' },
            { label: 'Enviados', count: sentCount, value: 'Enviado' },
            { label: 'Entregados', count: deliveredCount, value: 'Entregado' },
            { label: 'Cancelados', count: cancelledCount, value: 'Cancelado' }
        ];
    }

    toggleExpand(orderId: string) {
        if (this.expandedOrderId === orderId) {
            this.expandedOrderId = null;
        } else {
            this.expandedOrderId = orderId;
        }
    }

    get filteredOrders() {
        if (this.activeFilter === 'Todos') {
            return this.orders;
        }
        return this.orders.filter(order => order.status === this.activeFilter);
    }

    setFilter(filter: string) {
        this.activeFilter = filter;
    }

    // Helpers for Resume Badge Styles
    getStatusColor(status: string): string {
        switch (status) {
            case 'Entregado': return 'bg-green-100 text-green-700';
            case 'Enviado': return 'bg-yellow-100 text-yellow-800'; // Standardized yellow
            case 'Preparando': return 'bg-blue-100 text-blue-700';
            case 'Pendiente': return 'bg-orange-100 text-orange-700'; // Standardized orange
            case 'Cancelado': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'Entregado': return 'ri-checkbox-circle-line';
            case 'Enviado': return 'ri-truck-line';
            case 'Preparando': return 'ri-box-3-line'; // Standardized icon
            case 'Pendiente': return 'ri-time-line';
            case 'Cancelado': return 'ri-close-circle-line';
            default: return 'ri-question-line';
        }
    }
}
