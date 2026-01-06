import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
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
    orderNumber: number; // Raw number for linking
    status: 'Pendiente' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado' | string;
    date: Date;
    itemsCount: number;
    trackingId?: string;
    total: number;
    deliveryDate?: string;
    products: ProductItem[];
    address?: {
        calle: string;
        ciudad: string;
        provincia?: string;
        codigo_postal?: string;
        referencia?: string;
    };
    paymentInfo?: {
        metodo: string;
        subtotal: number;
        costo_envio: number;
        total: number;
    };
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
    router = inject(Router);

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
                // Sort by date desc
                const sorted = (data as BackendOrder[]).sort((a, b) =>
                    new Date(b.fecha_compra).getTime() - new Date(a.fecha_compra).getTime()
                );
                this.orders = sorted.map(order => this.mapBackendOrder(order));
                this.updateFilters();
            },
            error: (err) => console.error('Error fetching user orders', err)
        });
    }

    mapBackendOrder(backendOrder: BackendOrder): Order {
        return {
            id: `ORD-WEB-${backendOrder.numero_pedido_web}`,
            orderNumber: backendOrder.numero_pedido_web,
            status: this.mapStatus(backendOrder.estado_pedido),
            date: new Date(backendOrder.fecha_compra),
            itemsCount: backendOrder.items.length,
            trackingId: backendOrder.datos_envio?.guia_tracking,
            total: backendOrder.resumen_financiero.total_pagado,
            deliveryDate: backendOrder.estado_pedido.toLowerCase() === 'entregado' ? 'Entregado' : 'Por confirmar',
            address: backendOrder.datos_envio?.direccion_destino,
            paymentInfo: {
                metodo: backendOrder.resumen_financiero.metodo_pago,
                subtotal: backendOrder.resumen_financiero.subtotal_sin_impuestos,
                costo_envio: backendOrder.resumen_financiero.costo_envio,
                total: backendOrder.resumen_financiero.total_pagado
            },
            products: backendOrder.items.map(item => ({
                name: item.nombre,
                quantity: item.cantidad,
                totalPrice: item.subtotal,
                unitPrice: item.precio_unitario_aplicado,
                image: 'assets/products/placeholder.png'
            }))
        };
    }

    mapStatus(backendStatus: string): string {
        const status = backendStatus.toUpperCase().trim();
        const statusMap: { [key: string]: string } = {
            'PAGADO': 'Pendiente',
            'PENDIENTE': 'Pendiente',
            'PENDIENTE_PAGO': 'Pendiente',
            'EN_PREPARACION': 'Preparando',
            'PREPARANDO': 'Preparando',
            'ENVIADO': 'Enviado',
            'ENTREGADO': 'Entregado',
            'CANCELADO': 'Cancelado'
        };
        return statusMap[status] || 'Pendiente';
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

    openInvoice(orderNumber: number) {
        const url = this.router.serializeUrl(
            this.router.createUrlTree(['/orders/invoice', orderNumber])
        );
        window.open(url, '_blank');
    }

    // --- Cancellation Logic ---
    showCancelModal = false;
    orderToCancel: Order | null = null;
    isCancelling = false;

    initiateCancel(order: Order) {
        this.orderToCancel = order;
        this.showCancelModal = true;
    }

    closeCancelModal() {
        this.showCancelModal = false;
        this.orderToCancel = null;
    }

    confirmCancel() {
        if (!this.orderToCancel) return;

        const userId = this.authService.user()?._id;
        if (!userId) return;

        this.isCancelling = true;
        this.orderService.cancelOrder(this.orderToCancel.id.replace('ORD-WEB-', ''), userId).subscribe({
            next: () => {
                this.isCancelling = false;
                this.closeCancelModal();
                // Refresh list
                this.loadUserOrders();
                // Optional: Show success toast/alert
                alert('Pedido cancelado correctamente');
            },
            error: (err) => {
                this.isCancelling = false;
                console.error('Error cancelling order', err);
                alert('No se pudo cancelar el pedido. Intente nuevamente.');
                this.closeCancelModal();
            }
        });
    }
}
