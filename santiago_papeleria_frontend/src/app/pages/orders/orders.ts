import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface ProductItem {
    name: string;
    quantity: number;
    totalPrice: number;
    unitPrice: number;
    image: string;
}

interface Order {
    id: string;
    status: 'Pendiente' | 'Procesando' | 'Enviado' | 'Entregado';
    date: string;
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
export class Orders {
    authService = inject(AuthService);
    activeFilter: string = 'Todos';
    expandedOrderId: string | null = null; // Track expanded order

    // Mock Data from Screenshots
    mockOrders: Order[] = [
        {
            id: 'ORD-2024-001',
            status: 'Entregado',
            date: '14 de enero de 2024',
            itemsCount: 8,
            trackingId: 'TRK-2024-001',
            total: 156.80,
            deliveryDate: '17 de enero de 2024',
            products: [
                { name: 'Cuaderno Universitario 100 Hojas', quantity: 5, totalPrice: 12.50, unitPrice: 2.50, image: 'assets/products/cuaderno.png' },
                { name: 'Bolígrafo BIC Cristal Azul (Caja 50 unidades)', quantity: 2, totalPrice: 50.00, unitPrice: 25.00, image: 'assets/products/boligrafo.png' },
                { name: 'Resma Papel Bond A4 75g (500 hojas)', quantity: 10, totalPrice: 48.00, unitPrice: 4.80, image: 'assets/products/resma.png' }
            ]
        },
        {
            id: 'ORD-2024-002',
            status: 'Enviado',
            date: '19 de enero de 2024',
            itemsCount: 4,
            trackingId: 'TRK-2024-002',
            total: 89.50,
            deliveryDate: '22 de enero de 2024',
            products: [
                { name: 'Set Marcadores Sharpie 12 Colores', quantity: 3, totalPrice: 55.50, unitPrice: 18.50, image: 'assets/products/marcadores.png' },
                { name: 'Calculadora Científica Casio FX-570', quantity: 1, totalPrice: 35.00, unitPrice: 35.00, image: 'assets/products/calculadora.png' }
            ]
        },
        {
            id: 'ORD-2024-003',
            status: 'Procesando',
            date: '21 de enero de 2024',
            itemsCount: 12,
            total: 234.75,
            deliveryDate: '25 de enero de 2024',
            products: [
                { name: 'Acuarelas Pelikan 12 Colores', quantity: 5, totalPrice: 62.50, unitPrice: 12.50, image: 'assets/products/acuarelas.png' },
                { name: 'Mochila Escolar Totto Reforzada', quantity: 3, totalPrice: 135.00, unitPrice: 45.00, image: 'assets/products/mochila.png' },
                { name: 'Lápices de Colores Faber-Castell x24', quantity: 4, totalPrice: 66.00, unitPrice: 16.50, image: 'assets/products/lapices.png' }
            ]
        },
        {
            id: 'ORD-2024-004',
            status: 'Pendiente',
            date: '24 de enero de 2024',
            itemsCount: 6,
            total: 67.25,
            deliveryDate: 'Por confirmar',
            products: [
                { name: 'Agenda Ejecutiva 2024', quantity: 2, totalPrice: 40.00, unitPrice: 20.00, image: 'assets/products/agenda.png' },
                { name: 'Post-it Notas Adhesivas 3x3', quantity: 4, totalPrice: 27.25, unitPrice: 6.81, image: 'assets/products/postit.png' }
            ]
        }
    ];

    /* 
       Filters: Todos (4), Pendientes (1), Procesando (1), Enviados (1), Entregados (1)
    */
    filters = [
        { label: 'Todos', count: 4, value: 'Todos' },
        { label: 'Pendientes', count: 1, value: 'Pendiente' },
        { label: 'Procesando', count: 1, value: 'Procesando' }, // Screenshot says Procesando
        { label: 'Enviados', count: 1, value: 'Enviado' },
        { label: 'Entregados', count: 1, value: 'Entregado' }
    ];

    toggleExpand(orderId: string) {
        if (this.expandedOrderId === orderId) {
            this.expandedOrderId = null;
        } else {
            this.expandedOrderId = orderId;
        }
    }

    get filteredOrders() {
        if (this.activeFilter === 'Todos') {
            return this.mockOrders;
        }
        return this.mockOrders.filter(order => order.status === this.activeFilter);
    }

    setFilter(filter: string) {
        this.activeFilter = filter;
    }

    // Helpers for Resume Badge Styles
    getStatusColor(status: string): string {
        switch (status) {
            case 'Entregado': return 'bg-green-100 text-green-700';
            case 'Enviado': return 'bg-purple-100 text-purple-700';
            case 'Procesando': return 'bg-blue-100 text-blue-700';
            case 'Pendiente': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'Entregado': return 'ri-checkbox-circle-line';
            case 'Enviado': return 'ri-truck-line';
            case 'Procesando': return 'ri-loader-4-line';
            case 'Pendiente': return 'ri-time-line';
            default: return 'ri-question-line';
        }
    }
}
