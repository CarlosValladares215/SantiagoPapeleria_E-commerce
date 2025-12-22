import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Order {
    id: string;
    guide: string;
    client: {
        name: string;
        ruc: string;
    };
    date: Date;
    itemsCount: number;
    totalUnits: number;
    total: number;
    paymentMethod: string;
    status: 'Confirmado' | 'En Preparación' | 'Enviado' | 'Pendiente' | 'Entregado' | 'Cancelado';
}

@Component({
    selector: 'app-warehouse-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class WarehouseDashboardComponent {

    activeTab: 'orders' | 'inventory' = 'orders';
    isStatusDropdownOpen = false;
    // KPI Data
    stats = {
        pending: 3,
        preparing: 1,
        transit: 1,
        delivered: 1
    };

    // Mock Orders Data
    orders: Order[] = [
        {
            id: 'PED-2024-001',
            guide: 'GUIA-2024-001',
            client: { name: 'Distribuidora El Estudiante', ruc: '1792345678001' },
            date: new Date('2024-01-15T09:30:00'),
            itemsCount: 3,
            totalUnits: 100,
            total: 1050.00,
            paymentMethod: 'Transferencia',
            status: 'Confirmado'
        },
        {
            id: 'PED-2024-002',
            guide: 'GUIA-2024-002',
            client: { name: 'Papelería San Francisco', ruc: '1791234567001' },
            date: new Date('2024-01-15T10:15:00'),
            itemsCount: 2,
            totalUnits: 115,
            total: 1075.00,
            paymentMethod: 'Contraentrega',
            status: 'En Preparación'
        },
        {
            id: 'PED-2024-003',
            guide: 'GUIA-2024-003',
            client: { name: 'Libreria Universitaria', ruc: '1793456789001' },
            date: new Date('2024-01-15T11:45:00'),
            itemsCount: 3,
            totalUnits: 75,
            total: 740.00,
            paymentMethod: 'Tarjeta',
            status: 'Enviado'
        },
        {
            id: 'PED-2024-004',
            guide: 'GUIA-2024-004',
            client: { name: 'Comercial Papeles del Norte', ruc: '1794567890001' },
            date: new Date('2024-01-15T13:20:00'),
            itemsCount: 2,
            totalUnits: 55,
            total: 930.00,
            paymentMethod: 'Transferencia',
            status: 'Pendiente'
        },
        {
            id: 'PED-2024-005',
            guide: 'GUIA-2024-005',
            client: { name: 'Distribuidora Escolar', ruc: '1795678901001' },
            date: new Date('2024-01-14T16:00:00'),
            itemsCount: 3,
            totalUnits: 55,
            total: 780.00,
            paymentMethod: 'Transferencia',
            status: 'Entregado'
        },
        {
            id: 'PED-2024-006',
            guide: '',
            client: { name: 'Papelería Central', ruc: '1796789012001' },
            date: new Date('2024-01-15T14:30:00'),
            itemsCount: 2,
            totalUnits: 62,
            total: 561.00,
            paymentMethod: 'Contraentrega',
            status: 'Confirmado'
        }
    ];

    // Inventory Data
    inventoryStats = {
        totalProducts: 15,
        lowStock: 0,
        totalValue: 36385.00,
        avgStock: 272
    };

    inventoryItems = [
        {
            code: 'PAP-001',
            name: 'Resma Papel Bond A4',
            description: '75g - Caja x 10 unidades',
            category: 'Papel',
            stock: 500,
            min: 100,
            max: 1000,
            status: 'Stock Normal',
            price: 3.50
        },
        {
            code: 'LAP-045',
            name: 'Lápiz HB Mongol',
            description: 'Caja x 144 unidades',
            category: 'Escritura',
            stock: 150,
            min: 50,
            max: 500,
            status: 'Stock Normal',
            price: 12.00
        },
        {
            code: 'CUA-023',
            name: 'Cuaderno Universitario',
            description: '100 hojas - Paquete x 12',
            category: 'Cuadernos',
            stock: 200,
            min: 80,
            max: 600,
            status: 'Stock Normal',
            price: 18.50
        },
        {
            code: 'BOL-012',
            name: 'Bolígrafo BIC Azul',
            description: 'Caja x 50 unidades',
            category: 'Escritura',
            stock: 800,
            min: 200,
            max: 1500,
            status: 'Stock Normal',
            price: 8.50
        },
        {
            code: 'COR-089',
            name: 'Corrector Líquido',
            description: '20ml - Caja x 24',
            category: 'Corrección',
            stock: 120,
            min: 40,
            max: 300,
            status: 'Stock Normal',
            price: 15.00
        }
    ];

    getStatusClass(status: string): string {
        switch (status) {
            case 'Confirmado': return 'bg-red-100 text-red-700 border-red-200';
            case 'Pendiente': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'En Preparación': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Enviado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Entregado': return 'bg-green-100 text-green-700 border-green-200';
            case 'Cancelado': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'Confirmado': return 'ri-alert-line';
            case 'Pendiente': return 'ri-time-line';
            case 'En Preparación': return 'ri-box-3-line';
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

    // Mock Data for Modal
    orderProducts = [
        { code: 'PAP-001', name: 'Resma Papel Bond A4', description: '75g - Caja x 10 unidades', quantity: 50, price: 3.50, subtotal: 175.00 },
        { code: 'LAP-045', name: 'Lápiz HB Mongol', description: 'Caja x 144 unidades', quantity: 20, price: 12.00, subtotal: 240.00 },
        { code: 'CUA-023', name: 'Cuaderno Universitario', description: '100 hojas - Paquete x 12', quantity: 30, price: 18.50, subtotal: 555.00 }
    ];

    viewOrder(order: Order) {
        this.selectedOrder = order;
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
}
