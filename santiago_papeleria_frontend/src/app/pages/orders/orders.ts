import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';
import { OrderService, Order as BackendOrder } from '../../services/order/order.service';
import { ProfileSidebarComponent } from '../../components/profile-sidebar/profile-sidebar';

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
    status: 'Pendiente' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado' | 'Devolución Pendiente' | 'Devolución Aprobada' | 'Devolución Rechazada' | string;
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
    warehouseObservations?: string;
    paymentStatus?: string; // Added for Triple State
    returnDetails?: {
        motivo: string;
        items: {
            name: string;
            quantity: number;
        }[];
    };
}


@Component({
    selector: 'app-orders',
    standalone: true,
    imports: [CommonModule, NgClass, RouterLink, FormsModule, ProfileSidebarComponent],
    templateUrl: './orders.html',
    styleUrl: './orders.scss'
})
export class Orders implements OnInit {
    authService = inject(AuthService);
    orderService = inject(OrderService);
    router = inject(Router);

    activeFilter = signal<string>('Todos');
    expandedOrderId = signal<string | null>(null);
    isLoading = signal<boolean>(true);

    orders = signal<Order[]>([]);

    filters = signal([
        { label: 'Todos', count: 0, value: 'Todos' },
        { label: 'Pendientes', count: 0, value: 'Pendiente' },
        { label: 'Preparando', count: 0, value: 'Preparando' },
        { label: 'Enviados', count: 0, value: 'Enviado' },
        { label: 'Entregados', count: 0, value: 'Entregado' },
        { label: 'Devoluciones', count: 0, value: 'Devolucion' },
        { label: 'Cancelados', count: 0, value: 'Cancelado' }
    ]);

    // Computed Filtered Orders
    filteredOrders = computed(() => {
        const currentFilter = this.activeFilter();
        const currentOrders = this.orders();

        if (currentFilter === 'Todos') {
            return currentOrders;
        }
        if (currentFilter === 'Devolucion') {
            return currentOrders.filter(order => order.status.includes('Devolución'));
        }
        return currentOrders.filter(order => order.status === currentFilter);
    });

    ngOnInit() {
        this.loadUserOrders();
    }

    loadUserOrders() {
        const userId = this.authService.user()?._id;
        if (!userId) {
            this.isLoading.set(false);
            return;
        }

        this.isLoading.set(true);
        this.orderService.getOrdersByUser(userId).subscribe({
            next: (data) => {
                // Sort by date desc
                const sorted = (data as BackendOrder[]).sort((a, b) =>
                    new Date(b.fecha_compra).getTime() - new Date(a.fecha_compra).getTime()
                );
                this.orders.set(sorted.map(order => this.mapBackendOrder(order)));
                this.updateFilters();
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error fetching user orders', err);
                this.isLoading.set(false);
            }
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
            paymentStatus: backendOrder.estado_pago || 'NO_PAGADO', // Map Payment Status
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
                image: 'https://res.cloudinary.com/dufklhqtz/image/upload/v1768924502/placeholder_ni9blz.png'
            })),
            warehouseObservations: backendOrder.datos_devolucion?.observaciones_bodega,
            returnDetails: backendOrder.datos_devolucion ? {
                motivo: backendOrder.datos_devolucion.motivo,
                items: backendOrder.datos_devolucion.items?.map((i: any) => ({
                    name: i.nombre,
                    quantity: i.cantidad
                })) || []
            } : undefined
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
            'CANCELADO': 'Cancelado',
            'PENDIENTE_REVISION': 'Devolución Pendiente',
            'DEVOLUCION_APROBADA': 'Devolución Aprobada',
            'DEVOLUCION_RECHAZADA': 'Devolución Rechazada'
        };
        return statusMap[status] || 'Pendiente';
    }

    updateFilters() {
        const os = this.orders();
        const allCount = os.length;
        const pendingCount = os.filter(o => o.status === 'Pendiente').length;
        const preparingCount = os.filter(o => o.status === 'Preparando').length;
        const sentCount = os.filter(o => o.status === 'Enviado').length;
        const deliveredCount = os.filter(o => o.status === 'Entregado').length;
        const cancelledCount = os.filter(o => o.status === 'Cancelado').length;
        const returnsCount = os.filter(o => o.status.includes('Devolución')).length;

        this.filters.set([
            { label: 'Todos', count: allCount, value: 'Todos' },
            { label: 'Pendientes', count: pendingCount, value: 'Pendiente' },
            { label: 'Preparando', count: preparingCount, value: 'Preparando' },
            { label: 'Enviados', count: sentCount, value: 'Enviado' },
            { label: 'Entregados', count: deliveredCount, value: 'Entregado' },
            { label: 'Devoluciones', count: returnsCount, value: 'Devolucion' },
            { label: 'Cancelados', count: cancelledCount, value: 'Cancelado' }
        ]);
    }

    toggleExpand(orderId: string) {
        if (this.expandedOrderId() === orderId) {
            this.expandedOrderId.set(null);
        } else {
            this.expandedOrderId.set(orderId);
        }
    }

    setFilter(filter: string) {
        this.activeFilter.set(filter);
    }

    // Helpers for Resume Badge Styles
    getStatusColor(status: string): string {
        switch (status) {
            case 'Entregado': return 'bg-green-100 text-green-700';
            case 'Enviado': return 'bg-yellow-100 text-yellow-800'; // Standardized yellow
            case 'Preparando': return 'bg-blue-100 text-blue-700';
            case 'Pendiente': return 'bg-orange-100 text-orange-700'; // Standardized orange
            case 'Cancelado': return 'bg-gray-100 text-gray-700';

            // New Return Statuses (HU048)
            case 'Devolución Aprobada': return 'bg-green-100 text-green-700';
            case 'Devolución Rechazada': return 'bg-red-100 text-red-700';
            case 'Devolución Pendiente': return 'bg-yellow-100 text-yellow-800';

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

            // New Return Statuses (HU048)
            case 'Devolución Aprobada': return 'ri-check-double-line';
            case 'Devolución Rechazada': return 'ri-close-circle-line';
            case 'Devolución Pendiente': return 'ri-time-line';

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

    // --- Return Logic (HU046) ---
    showReturnModal = false;
    orderToReturn: Order | null = null;
    isReturning = false;
    returnForm = {
        motivo: '',
        items: [] as { name: string, quantity: number, selected: boolean, max: number }[]
    };

    canReturn(order: Order): boolean {
        if (order.status !== 'Entregado') return false;

        // 5 days verification
        const deliveryDate = order.date; // Use order date as fallback if delivery date is string 'Entregado'
        // Ideally 'order.date' is purchase date. We need actual delivery date from backend
        // For strictly HU: "Validar elegibilidad (5 días)"
        // Since frontend 'order' interface maps deliveryDate as string, we use order.date for now as approximation 
        // or we rely on backend error. Let's filter visually using order.date + reasonable delivery time or just order.date

        const diffTime = Math.abs(new Date().getTime() - new Date(order.date).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays <= 10; // Allow opening modal liberally, backend enforces 5 days from delivery
    }

    initiateReturn(order: Order) {
        this.orderToReturn = order;
        this.returnForm = {
            motivo: '',
            items: order.products.map(p => ({
                name: p.name,
                quantity: 1,
                selected: false,
                max: p.quantity
            }))
        };
        this.showReturnModal = true;
    }

    validateQuantity(item: any) {
        if (item.quantity > item.max) {
            item.quantity = item.max;
        } else if (item.quantity < 1) {
            item.quantity = 1;
        }
    }

    closeReturnModal() {
        this.showReturnModal = false;
        this.orderToReturn = null;
    }

    submitReturn() {
        if (!this.orderToReturn) return;

        const selectedItems = this.returnForm.items
            .filter(i => i.selected)
            .map(i => ({ nombre: i.name, cantidad: i.quantity, codigo: 'N/A' })); // Code not in frontend model yet

        if (selectedItems.length === 0) {
            alert('Debes seleccionar al menos un producto para devolver');
            return;
        }
        if (!this.returnForm.motivo.trim()) {
            alert('Debes ingresar un motivo para la devolución');
            return;
        }

        const userId = this.authService.user()?._id;
        if (!userId) return;

        this.isReturning = true;
        this.orderService.requestReturn(this.orderToReturn.id.replace('ORD-WEB-', ''), userId, {
            items: selectedItems,
            motivo: this.returnForm.motivo
        }).subscribe({
            next: () => {
                this.isReturning = false;
                this.closeReturnModal();
                this.loadUserOrders();
                alert('Solicitud de devolución enviada correctamente. Estado: Pendiente de Revisión');
            },
            error: (err) => {
                this.isReturning = false;
                console.error('Error requesting return', err);
                alert(err.error?.message || 'Error al solicitar devolución');
            }
        });
    }
}
