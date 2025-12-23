import { Component, ChangeDetectorRef, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    paymentProofUrl?: string;
    status: 'Pendiente' | 'Preparando' | 'Enviado' | 'Entregado' | 'Cancelado';
    products: any[];
}

@Component({
    selector: 'app-warehouse-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    providers: [ErpService], // OrderService and ProductService are provided in root
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class WarehouseDashboardComponent implements OnInit {

    activeTab: 'orders' | 'inventory' = 'orders';
    isStatusDropdownOpen = false;
    // KPI Data
    stats = {
        pending: 0,
        preparing: 0,
        transit: 0,
        delivered: 0
    };

    // Mock Orders Data
    orders: Order[] = [];

    // Inventory Data
    inventoryStats = {
        totalProducts: 0,
        lowStock: 0,
        totalValue: 0,
        avgStock: 0
    };

    inventoryItems: any[] = [];

    private productService = inject(ProductService);

    constructor(
        private erpService: ErpService,
        private cd: ChangeDetectorRef,
        private orderService: OrderService
    ) {
        // Sync Inventory when ProductService updates
        effect(() => {
            const products = this.productService.products();
            if (products.length > 0) {
                this.mapInventoryItems(products);
            }
        });
    }

    ngOnInit() {
        this.checkSyncState();
        this.loadDashboardData();
    }

    checkSyncState() {
        // Verificar si la sesión ya estaba sincronizada (persistencia tras recarga)
        if (typeof window !== 'undefined' && sessionStorage.getItem('dobranet_sync_active') === 'true') {
            console.log('🔄 Sesión de DobraNet restaurada.');
            this.isConnected = true;
            this.loadOrders();
        }
    }

    loadDashboardData() {
        // this.loadOrders(); // Deshabilitado: Se cargan solo al Sincronizar
        // Trigger fetch products (will trigger effect)
        this.productService.fetchProducts({} as any);
    }

    loadOrders() {
        this.orderService.getOrders().subscribe({
            next: (data) => {
                this.orders = data.map(order => this.mapBackendOrder(order));
                this.updateOrderStats();
                this.cd.detectChanges();
            },
            error: (err) => console.error('Error loading orders', err)
        });
    }

    mapBackendOrder(backendOrder: BackendOrder): Order {
        // Safe check for client data if populated or not
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
            observations: 'Ninguna', // Placeholder as DB has no field yet
            date: new Date(backendOrder.fecha_compra),
            itemsCount: backendOrder.items.length,
            totalUnits: backendOrder.items.reduce((acc, item) => acc + item.cantidad, 0),
            total: backendOrder.resumen_financiero.total_pagado,
            paymentMethod: backendOrder.resumen_financiero.metodo_pago,
            paymentProofUrl: backendOrder.resumen_financiero.comprobante_pago ? `http://localhost:3000${backendOrder.resumen_financiero.comprobante_pago}` : undefined,
            status: this.mapStatus(backendOrder.estado_pedido),
            products: backendOrder.items.map(item => ({
                code: item.codigo_dobranet || 'GEN',
                name: item.nombre,
                quantity: item.cantidad,
                price: item.precio_unitario_aplicado,
                subtotal: item.subtotal
            })),
        };
    }

    mapStatus(backendStatus: string): any {
        // Map backend Enums to Frontend Display Strings
        const statusMap: { [key: string]: string } = {
            'PAGADO': 'Pendiente', // Consolidated
            'CONFIRMADO': 'Pendiente',
            'PENDIENTE': 'Pendiente',
            'EN_PREPARACION': 'Preparando',
            'PREPARANDO': 'Preparando',
            'ENVIADO': 'Enviado',
            'ENTREGADO': 'Entregado',
            'CANCELADO': 'Cancelado'
        };
        return statusMap[backendStatus] || 'Pendiente';
    }

    mapInventoryItems(products: any[]) {
        this.inventoryItems = products.map(p => ({
            code: p.sku || p.internal_id || 'N/A',
            name: p.name,
            description: p.description || '',
            category: p.category,
            stock: p.stock,
            min: 50, // Default or fetch if available
            max: 500, // Default
            status: p.stock < 50 ? 'Stock Bajo' : 'Stock Normal',
            price: p.price
        }));

        // Update Stats
        this.inventoryStats.totalProducts = products.length;
        this.inventoryStats.totalValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
        this.inventoryStats.avgStock = Math.floor(products.reduce((acc, p) => acc + p.stock, 0) / (products.length || 1));
        this.inventoryStats.lowStock = products.filter(p => p.stock < 50).length;
    }

    updateOrderStats() {
        this.stats = {
            pending: this.orders.filter(o => o.status === 'Pendiente').length,
            preparing: this.orders.filter(o => o.status === 'Preparando').length,
            transit: this.orders.filter(o => o.status === 'Enviado').length,
            delivered: this.orders.filter(o => o.status === 'Entregado').length,
        };
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'Pendiente': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Preparando': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Enviado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Entregado': return 'bg-green-100 text-green-700 border-green-200';
            case 'Cancelado': return 'bg-gray-100 text-gray-700 border-gray-200';
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
            default: return 'ri-question-line';
        }
    }

    getInventoryStatusClass(status: string): string {
        switch (status) {
            case 'Stock Normal': return 'bg-blue-100 text-blue-700';
            case 'Stock Bajo': return 'bg-red-100 text-red-700';
            case 'Exceso Stock': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    getStockProgressColor(current: number, min: number, max: number): string {
        if (current <= min) return 'bg-red-500';
        if (current >= max) return 'bg-green-500';
        return 'bg-blue-500';
    }

    getStockPercentage(current: number, max: number): number {
        return Math.min((current / max) * 100, 100);
    }

    // Modal Logic
    selectedOrder: Order | null = null;

    // Data for Modal
    orderProducts: any[] = [];

    viewOrder(order: Order) {
        this.selectedOrder = order;
        this.orderProducts = order.products || [];
    }

    closeModal() {
        this.selectedOrder = null;
        this.isStatusDropdownOpen = false;
    }

    toggleStatusDropdown() {
        this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    }

    selectStatus(status: any) {
        if (this.selectedOrder) {
            this.selectedOrder.status = status;
            this.isStatusDropdownOpen = false;

            // Reverse Map for Backend
            const backendStatusMap: { [key: string]: string } = {
                'Pendiente': 'PENDIENTE',
                'Preparando': 'PREPARANDO',
                'Enviado': 'ENVIADO',
                'Entregado': 'ENTREGADO',
                'Cancelado': 'CANCELADO'
            };

            const backendStatus = backendStatusMap[status] || status;

            this.orderService.updateOrderStatus(this.selectedOrder._id, backendStatus).subscribe({
                next: () => console.log('Estado actualizado exitosamente'),
                error: (err) => console.error('Error actualizando estado', err)
            });
        }
    }

    // ================= ADD STOCK MODAL LOGIC =================
    selectedInventoryItem: any | null = null;
    stockReasons = [
        'Compra a Proveedor',
        'Devolución de Cliente',
        'Ajuste de Inventario',
        'Transferencia de Bodega'
    ];

    stockForm = {
        quantity: null as number | null,
        reason: 'Compra a Proveedor',
        provider: '',
        notes: ''
    };

    openStockModal(item: any) {
        this.selectedInventoryItem = item;
        this.stockForm = {
            quantity: null,
            reason: 'Compra a Proveedor',
            provider: '',
            notes: ''
        };
    }

    closeStockModal() {
        this.selectedInventoryItem = null;
    }

    saveStock() {
        if (this.selectedInventoryItem && this.stockForm.quantity) {
            // Mock logic to update stock
            const newStock = this.selectedInventoryItem.stock + this.stockForm.quantity;
            this.selectedInventoryItem.stock = newStock;

            // Re-calculate mock inventory stats
            this.inventoryStats.avgStock = Math.floor((this.inventoryStats.avgStock * 15 + this.stockForm.quantity) / 15);

            this.closeStockModal();
        }
    }

    // ================= SYNC LOGIC =================
    isSyncing = false;
    isConnected = false;

    syncDobranet() {
        if (this.isSyncing) return;

        this.isSyncing = true;
        console.log('Iniciando sincronización (Lectura) con DobraNet desde Bodega...');

        // Using getRawData() to match Admin's 'ManualSyncComponent' behavior
        this.erpService.getRawData()
            .pipe(
                // Simulate realistic processing time (5 seconds) as requested
                delay(5000),
                timeout(35000), // Timeout after 35s
                finalize(() => {
                    this.isSyncing = false;
                    console.log('Sincronización finalizada (Loading stopped)');
                })
            )
            .subscribe({
                next: (data: any[]) => {
                    console.log('Datos recibidos de DobraNet:', data);

                    // Force update immediately
                    this.isSyncing = false;
                    this.isConnected = true;
                    // Guardar estado en SessionStorage para persistir tras recarga
                    sessionStorage.setItem('dobranet_sync_active', 'true');

                    this.loadOrders(); // Cargar pedidos SOLO después de sincronizar
                    this.cd.detectChanges(); // Ensure UI updates BEFORE alert

                    setTimeout(() => {
                        if (Array.isArray(data)) {
                            // Update local stats first to show "immediate" effect
                            this.inventoryStats.totalProducts = data.length;
                            this.inventoryStats.totalValue = data.reduce((acc, curr) => acc + (Number(curr.PVP) || 0), 0);

                            alert(`Sincronización completada con DobraNet.\n\nSe procesaron exitosamente ${data.length} productos del catálogo ERP.`);
                        } else {
                            alert('Conexión establecida, pero el formato de datos es inesperado.');
                        }
                    }, 500); // 500ms slight delay to ensure user sees the Green state first
                },
                error: (error: any) => {
                    console.error('Error al obtener datos de DobraNet:', error);

                    // Force update immediately
                    this.isSyncing = false;
                    this.isConnected = false;
                    this.cd.detectChanges(); // Ensure UI updates BEFORE alert

                    setTimeout(() => {
                        alert('Error al conectar con DobraNet. Asegúrese de que el simulador esté activo.');
                    }, 500);
                }
            });
    }

    refreshMetrics() {
        this.erpService.getDashboardMetrics().subscribe((metrics: any) => {
            if (metrics && metrics.metrics) {
                this.inventoryStats.totalProducts = metrics.metrics.totalProducts;
                this.cd.detectChanges();
            }
        });
    }
}
