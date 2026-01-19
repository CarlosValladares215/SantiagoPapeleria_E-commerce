import { Component, ChangeDetectorRef, OnInit, effect, inject } from '@angular/core';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { delay, timeout, finalize } from 'rxjs/operators';
import { ErpService } from '../../../services/erp/erp.service';
import { OrderService, Order as BackendOrder } from '../../../services/order/order.service';
import { ProductService } from '../../../services/product/product.service';

interface Order {
    _id: string; // Mongo ID
    id: string;
    guide: string;
    client: {
        name: string;
        ruc: string;
        type: string;
        email: string;
        phone: string;
    };
    shippingAddress: {
        full: string;
        city: string;
        province: string;
        postalCode: string;
        reference: string;
    };
    observations: string;
    date: Date;
    itemsCount: number;
    totalUnits: number;
    total: number;
    paymentMethod: string;
    paymentStatus: string;
    paymentProofUrl?: string;
    shippingCost: number;
    subtotal: number;
    status: 'Pendiente' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado' | 'Devolucion_Pendiente' | 'Devolucion_Aprobada' | 'Devolucion_Rechazada';
    products: any[];
    returnRequest?: {
        reason: string;
        date: Date;
        items: any[];
        status: string;
        warehouseObservations?: string;
    };
}

@Component({
    selector: 'app-warehouse-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    providers: [ErpService],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class WarehouseDashboardComponent implements OnInit {

    private router = inject(Router);

    activeTab: 'orders' | 'returns' = 'orders';
    isStatusDropdownOpen = false;
    // KPI Data
    stats = {
        pending: 0,
        preparing: 0,
        transit: 0,
        delivered: 0,
        cancelled: 0
    };

    // Returns KPI
    returnStats = {
        pending: 0,
        approved: 0,
        rejected: 0
    };

    orders: Order[] = [];

    // Derived lists
    get pendingReturns(): Order[] {
        return this.orders.filter(o => o.status === 'Devolucion_Pendiente');
    }

    private productService = inject(ProductService);

    constructor(
        private erpService: ErpService,
        private cd: ChangeDetectorRef,
        private orderService: OrderService
    ) { }

    ngOnInit() {
        this.checkSyncState();
        this.loadDashboardData();
    }

    checkSyncState() {
        if (typeof window !== 'undefined' && sessionStorage.getItem('dobranet_sync_active') === 'true') {
            console.log('🔄 Sesión de DobraNet restaurada.');
            this.isConnected = true;
            this.loadOrders();
        }
    }

    loadDashboardData() {
        // this.loadOrders(); 
    }

    loadOrders() {
        this.orderService.getOrders().subscribe({
            next: (data) => {
                // FILTER: Only show PAID orders in Warehouse Dashboard
                const allOrders = data.map(order => this.mapBackendOrder(order));
                this.orders = allOrders.filter(o => o.paymentStatus === 'PAGADO');

                this.updateOrderStats();
                this.cd.detectChanges();
            },
            error: (err) => console.error('Error loading orders', err)
        });
    }

    downloadGuide(order: Order) {
        if (!order) return;
        const url = this.router.serializeUrl(
            this.router.createUrlTree(['/orders/guide', order._id])
        );
        window.open(url, '_blank');
    }

    mapBackendOrder(backendOrder: BackendOrder): Order {
        const user = backendOrder.usuario_id as any;
        const isPopulated = user && typeof user === 'object';

        const clientName = isPopulated ? (`${user.nombres || ''} ${user.apellidos || ''}`.trim() || user.email || 'Cliente Web') : 'Cliente Web';
        const clientRuc = isPopulated ? (user.ruc || user.cedula || '9999999999999') : '9999999999999';
        const clientType = isPopulated ? (user.tipo_cliente || 'Minorista') : 'Minorista';
        const clientEmail = isPopulated ? user.email : 'N/A';
        const clientPhone = isPopulated ? (user.telefono || 'N/A') : 'N/A';

        const address = backendOrder.datos_envio?.direccion_destino;
        const fullAddress = address ? address.calle : 'No especificada';
        const city = address ? address.ciudad : 'N/A';

        let paymentStatus = (backendOrder as any).estado_pago || 'NO_PAGADO';

        // LEGACY FIX: Blind Warehouse Issue
        // If order is historically fulfilled (ENVIADO/ENTREGADO) but lacks payment status (old data), assume PAGADO.
        if (['ENVIADO', 'ENTREGADO'].includes(backendOrder.estado_pedido) && paymentStatus === 'NO_PAGADO') {
            paymentStatus = 'PAGADO';
        }

        // Map Return Data
        let returnRequest = undefined;
        if (backendOrder.datos_devolucion) {
            returnRequest = {
                reason: backendOrder.datos_devolucion.motivo,
                date: new Date(backendOrder.datos_devolucion.fecha_solicitud),
                items: backendOrder.datos_devolucion.items,
                status: backendOrder.datos_devolucion.estado, // PENDIENTE_REVISION, APROBADA, RECHAZADA
                warehouseObservations: (backendOrder.datos_devolucion as any).observaciones_bodega
            };
        }

        // Map Status (backendStatusMap inverse not strictly needed if we use same strings, but mapping for display)
        let displayStatus = this.mapStatus(backendOrder.estado_pedido);

        // Custom mapping for returns
        // Custom mapping for returns
        const returnState = backendOrder.estado_devolucion || backendOrder.datos_devolucion?.estado;

        if (returnState === 'PENDIENTE' || returnState === 'PENDIENTE_REVISION') displayStatus = 'Devolucion_Pendiente';
        if (returnState === 'APROBADA' || returnState === 'DEVOLUCION_APROBADA') displayStatus = 'Devolucion_Aprobada';
        if (returnState === 'RECHAZADA' || returnState === 'DEVOLUCION_RECHAZADA') displayStatus = 'Devolucion_Rechazada';
        if (returnState === 'RECIBIDA') displayStatus = 'Devolución Recibida'; // Or map to approved/pending based on flow

        // Legacy / Specific
        if (backendOrder.estado_pedido === 'CANCELADO') displayStatus = 'Cancelado';


        return {
            _id: backendOrder._id,
            id: `WEB-${backendOrder.numero_pedido_web}`,
            guide: backendOrder.datos_envio?.guia_tracking || '',
            client: {
                name: clientName,
                ruc: clientRuc,
                type: clientType,
                email: clientEmail,
                phone: clientPhone
            },
            shippingAddress: {
                full: fullAddress,
                city: city,
                province: address?.provincia || 'N/A',
                postalCode: address?.codigo_postal || 'N/A',
                reference: address?.referencia || 'N/A'
            },
            observations: 'Ninguna',
            date: new Date(backendOrder.fecha_compra),
            itemsCount: backendOrder.items.length,
            totalUnits: backendOrder.items.reduce((acc, item) => acc + item.cantidad, 0),
            subtotal: (backendOrder.resumen_financiero as any).subtotal || (backendOrder.resumen_financiero.total_pagado - (backendOrder.resumen_financiero.costo_envio || 0)),
            total: backendOrder.resumen_financiero.total_pagado,
            shippingCost: backendOrder.resumen_financiero.costo_envio || 0,
            paymentMethod: backendOrder.resumen_financiero.metodo_pago,
            paymentStatus: paymentStatus, // Map new field
            paymentProofUrl: backendOrder.resumen_financiero.comprobante_pago ? `http://localhost:3000${backendOrder.resumen_financiero.comprobante_pago}` : undefined,
            status: displayStatus,
            products: backendOrder.items.map(item => ({
                code: item.codigo_dobranet || 'GEN',
                name: item.nombre,
                quantity: item.cantidad,
                price: item.precio_unitario_aplicado,
                subtotal: item.subtotal
            })),
            returnRequest
        };
    }
    // ... (inside mapStatus)
    mapStatus(backendStatus: string): any {
        const statusMap: { [key: string]: string } = {
            'PENDIENTE': 'Pendiente', // Logistic Pending
            'PREPARADO': 'Preparando',
            'ENVIADO': 'Enviado',
            'ENTREGADO': 'Entregado',
            // 'CANCELADO': 'Cancelado', // Removed as it's handled by a specific if condition in mapBackendOrder
            // Return statuses handled separately if needed, but PENDIENTE_REVISION might still come in legacy data or we map 'estado_devolucion' in the future.
            'PENDIENTE_REVISION': 'Devolucion_Pendiente',
        };
        return statusMap[backendStatus] || 'Pendiente';
    }

    updateOrderStats() {
        this.stats = {
            pending: this.orders.filter(o => o.status === 'Pendiente').length,
            preparing: this.orders.filter(o => o.status === 'Preparando').length,
            transit: this.orders.filter(o => o.status === 'Enviado').length,
            delivered: this.orders.filter(o => o.status === 'Entregado').length,
            cancelled: this.orders.filter(o => o.status === 'Cancelado').length,
        };
        this.returnStats = {
            pending: this.orders.filter(o => o.status === 'Devolucion_Pendiente').length,
            approved: this.orders.filter(o => o.status === 'Devolucion_Aprobada').length,
            rejected: this.orders.filter(o => o.status === 'Devolucion_Rechazada').length,
        }
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'Pendiente': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Preparando': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Enviado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Entregado': return 'bg-green-100 text-green-700 border-green-200';
            case 'Cancelado': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'Devolucion_Pendiente': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Devolucion_Aprobada': return 'bg-teal-100 text-teal-700 border-teal-200';
            case 'Devolucion_Rechazada': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'Pendiente': return 'ri-time-line';
            case 'Preparando': return 'ri-box-3-line';
            case 'Enviado': return 'ri-truck-line';
            case 'Entregado': return 'ri-checkbox-circle-line';
            case 'Cancelado': return 'ri-close-circle-line';
            case 'Devolucion_Pendiente': return 'ri-arrow-go-back-line';
            case 'Devolucion_Aprobada': return 'ri-check-double-line';
            case 'Devolucion_Rechazada': return 'ri-close-line';
            default: return 'ri-question-line';
        }
    }

    // ================= FILTERS & FILTERING LOGIC =================
    searchTerm: string = '';
    filterStatus: string = 'Todos los estados';
    startDate: string = '';
    endDate: string = '';

    get filteredOrders(): Order[] {
        return this.orders.filter(order => {
            // Exclude Returns from main list if needed, or keeping them mixed?
            // Usually dashboard "Pedidos" shows all sales. Returns might be mixed or filtered.
            // If status is 'Devolucion_Pendiente', it's still an order.
            const term = this.searchTerm.toLowerCase();
            const matchesText = !term ||
                order.id.toLowerCase().includes(term) ||
                (order.guide && order.guide.toLowerCase().includes(term)) ||
                order.client.name.toLowerCase().includes(term);

            const matchesStatus = this.filterStatus === 'Todos los estados' || order.status === this.filterStatus;

            let matchesDate = true;
            if (this.startDate) {
                matchesDate = matchesDate && new Date(order.date) >= new Date(this.startDate);
            }
            if (this.endDate) {
                const end = new Date(this.endDate);
                end.setHours(23, 59, 59, 999);
                matchesDate = matchesDate && new Date(order.date) <= end;
            }

            return matchesText && matchesStatus && matchesDate;
        });
    }

    get returnOrders(): Order[] {
        return this.orders.filter(order =>
            ['Devolucion_Pendiente', 'Devolucion_Aprobada', 'Devolucion_Rechazada'].includes(order.status)
        );
    }

    // Modal Logic
    selectedOrder: Order | null = null;
    orderProducts: any[] = [];
    viewOrder(order: Order) {
        this.selectedOrder = order;
        this.pendingStatus = null;
        this.orderProducts = order.products || [];
    }

    closeModal() {
        this.selectedOrder = null;
        this.pendingStatus = null;
        this.isStatusDropdownOpen = false;
    }

    toggleStatusDropdown() {
        this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    }

    // Status Management
    canSwitchTo(newStatus: string): boolean {
        if (!this.selectedOrder) return false;

        const currentStatus = this.selectedOrder.status;

        // 1. Same status check
        if (currentStatus === newStatus) return false;

        // 2. Cancellation logic: Allow cancelling from non-final states
        if (newStatus === 'Cancelado') {
            return !['Entregado', 'Cancelado', 'Devolucion_Aprobada', 'Devolucion_Rechazada', 'Devolucion_Pendiente'].includes(currentStatus);
        }

        // 3. Define the strict sequence
        const statusFlow = ['Pendiente', 'Preparando', 'Enviado', 'Entregado'];
        const currentIndex = statusFlow.indexOf(currentStatus);
        const newIndex = statusFlow.indexOf(newStatus);

        // If current or new status is not in the main flow (e.g. it's a Return status), block manual transition via this dropdown
        if (currentIndex === -1 || newIndex === -1) return false;

        // 4. Sequential check: Only allow moving to the IMMEDIATE NEXT step
        return newIndex === currentIndex + 1;
    }

    pendingStatus: string | null = null;
    selectStatus(status: any) {
        if (!this.selectedOrder) return;

        // Security check using the same logic
        if (!this.canSwitchTo(status)) {
            // Optional: Show a toast or shake the button
            return;
        }

        this.pendingStatus = status;
        this.isStatusDropdownOpen = false;
    }

    confirmStatusUpdate() {
        if (this.selectedOrder && this.pendingStatus) {
            Swal.fire({
                title: '¿Confirmar cambio de estado?',
                text: `El pedido pasará a estado: ${this.pendingStatus}`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#F2CB07',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, Cambiar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    this.updateStatus(this.selectedOrder!, this.pendingStatus!);
                }
            });
        }
    }

    markAsDelivered(order: Order) {
        if (order.status === 'Entregado') return;

        Swal.fire({
            title: '¿Marcar como Entregado?',
            text: `El pedido ${order.id} se marcará como entregado.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, Entregado',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.updateStatus(order, 'Entregado');
            }
        });
    }

    private updateStatus(order: Order, newStatus: string) {
        const backendStatusMap: { [key: string]: string } = {
            'Pendiente': 'PENDIENTE',
            'Preparando': 'PREPARANDO',
            'Enviado': 'ENVIADO',
            'Entregado': 'ENTREGADO',
            'Cancelado': 'CANCELADO',
            'Devolucion_Pendiente': 'PENDIENTE_REVISION', // Though usually status update doesn't trigger this manually from dropdown
        };

        const backendStatus = backendStatusMap[newStatus] || newStatus;

        this.orderService.updateOrderStatus(order._id, backendStatus).subscribe({
            next: () => {
                order.status = newStatus as any;
                this.pendingStatus = null;
                this.updateOrderStats();
                this.cd.detectChanges();
            },
            error: (err) => {
                console.error('Error actualizando estado', err);
                alert('Error al actualizar estado');
            }
        });
    }

    // ================= RETURN VALIDATION LOGIC =================
    selectedReturnOrder: Order | null = null;
    returnValidationForm = {
        observations: ''
    };

    openReturnValidation(order: Order) {
        this.selectedReturnOrder = order;
        this.returnValidationForm.observations = '';
    }

    closeReturnValidation() {
        this.selectedReturnOrder = null;
    }

    validateReturn(decision: 'APPROVE' | 'REJECT') {
        if (!this.selectedReturnOrder) return;

        const confirmMsg = decision === 'APPROVE'
            ? '¿Aprobar esta devolución? El estado cambiará a DEVOLUCIÓN APROBADA.'
            : '¿Rechazar esta devolución? El pedido mantendrá su estado original o pasará a Rechazado.';

        if (!confirm(confirmMsg)) return;

        const url = `${this.orderService['apiUrl']}/${this.selectedReturnOrder._id}/return/validate`;

        // HACK: calling http directly or need to extend order service. 
        // Better extend order service properly, but for speed injecting HttpClient here or assuming OrderService has generic method?
        // Let's add validateReturn to OrderService frontend first to be clean, OR use direct call via OrderService if exposed.
        // I will assume I need to add it to OrderService TS as well.
        // But first, let's just use existing updateStatus? No, it's a specific endpoint.
        // Let's modify OrderService on the fly or add it here using OrderService.http if public (it's not).
        // Call validateReturn directly from OrderService
        this.orderService.validateReturn(this.selectedReturnOrder._id.replace('ORD-WEB-', ''), decision, this.returnValidationForm.observations).subscribe({
            next: (updatedOrder: any) => {
                console.log('✅ [Frontend] ValidateReturn Success. Updated Order:', updatedOrder);
                console.log('✅ [Frontend] Updated Order Status:', updatedOrder.estado_pedido);

                // Manually update local state to reflect change immediately
                this.orders = this.orders.map(o => {
                    if (o._id === updatedOrder._id) {
                        return this.mapBackendOrder(updatedOrder);
                    }
                    return o;
                });
                this.updateOrderStats();

                alert(`Devolución ${decision === 'APPROVE' ? 'APROBADA' : 'RECHAZADA'} exitosamente.`);
                this.closeReturnValidation();
                setTimeout(() => this.loadOrders(), 500); // Small delay to allow DB propagation
            },
            error: (err: any) => {
                console.error('❌ [Frontend] Error validando devolución', err);
                alert('Error al validar la devolución');
            }
        });
    }

    // ================= SYNC LOGIC =================
    isSyncing = false;
    isConnected = false;

    syncDobranet() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.erpService.getRawData()
            .pipe(
                delay(2000), // Reduced delay for better UX
                timeout(35000),
                finalize(() => {
                    this.isSyncing = false;
                })
            )
            .subscribe({
                next: (data: any[]) => {
                    this.isSyncing = false;
                    this.isConnected = true;
                    sessionStorage.setItem('dobranet_sync_active', 'true');
                    this.loadOrders();
                    this.cd.detectChanges();
                    setTimeout(() => {
                        alert(`Sincronización completada.`);
                    }, 500);
                },
                error: (error: any) => {
                    this.isSyncing = false;
                    this.isConnected = false;
                    this.cd.detectChanges();
                    setTimeout(() => {
                        alert('Error al conectar con DobraNet.');
                    }, 500);
                }
            });
    }
}
