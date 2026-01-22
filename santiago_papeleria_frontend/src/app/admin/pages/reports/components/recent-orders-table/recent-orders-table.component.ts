import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderDetailModalComponent } from '../order-detail-modal/order-detail-modal.component';

@Component({
  selector: 'app-recent-orders-table',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderDetailModalComponent],
  template: `
    <div class="space-y-4">
        <!-- Filters Header -->
        <div class="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <h3 class="text-lg font-semibold text-gray-800">Pedidos Recientes</h3>
            <div class="flex gap-4 items-center">
                <div class="flex items-center gap-2">
                    <label class="text-sm font-medium text-gray-700">Estado Logístico:</label>
                    <select [(ngModel)]="selectedStatus" (change)="onFilterChange()" class="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 p-2">
                        <option *ngFor="let s of statuses" [value]="s">{{s}}</option>
                    </select>
                </div>
                 <div class="flex items-center gap-2">
                    <label class="text-sm font-medium text-gray-700">Pago:</label>
                    <select [(ngModel)]="selectedPaymentStatus" (change)="onFilterChange()" class="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 p-2">
                        <option *ngFor="let ps of paymentStatuses" [value]="ps">{{ps}}</option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                    <label class="text-sm font-medium text-gray-700">Tipo Cliente:</label>
                    <select [(ngModel)]="selectedCustomerType" (change)="onFilterChange()" class="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 p-2">
                        <option *ngFor="let t of customerTypes" [value]="t">{{t}}</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table class="min-w-full text-sm text-left text-gray-500 bg-white">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
                <th scope="col" class="px-6 py-3">ID Pedido</th>
                <th scope="col" class="px-6 py-3">Cliente</th>
                <th scope="col" class="px-6 py-3">Fecha</th>
                <th scope="col" class="px-6 py-3">Total</th>
                <th scope="col" class="px-6 py-3">Pago</th>
                <th scope="col" class="px-6 py-3">Estado Logístico</th>
                <th scope="col" class="px-6 py-3">Devolución</th>
                <th scope="col" class="px-6 py-3 text-right">Acciones</th>
            </tr>
            </thead>
            <tbody>
            <tr *ngFor="let order of orders" class="border-b hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                #{{ order.numero_pedido_web }}
                </td>
                <td class="px-6 py-4">
                  <div class="font-medium text-gray-900">
                    {{ order.usuario_id?.nombre 
                        ? (order.usuario_id.nombre + ' ' + (order.usuario_id.apellido || '')) 
                        : (order.usuario_id?.razon_social || order.usuario_id?.email || 'Cliente Desconocido') 
                    }}
                  </div>
                  <div class="text-xs text-gray-500 font-medium bg-gray-100 inline-block px-2 py-0.5 rounded mt-1" *ngIf="order.usuario_id?.tipo_cliente">
                    {{ order.usuario_id.tipo_cliente }}
                  </div>
                </td>
                <td class="px-6 py-4">
                {{ order.fecha_compra | date:'shortDate' }}
                </td>
                <td class="px-6 py-4 font-semibold text-gray-900">
                {{ order.resumen_financiero.total_pagado | currency }}
                </td>
                <!-- Payment Status Column -->
                <td class="px-6 py-4">
                    <span [ngClass]="getPaymentStatusClass(order.estado_pago || 'NO_PAGADO')" class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                        {{ order.estado_pago || 'NO_PAGADO' }}
                    </span>
                </td>
                <td class="px-6 py-4">
                <span [ngClass]="getStatusClass(order.estado_pedido)" class="px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase">
                    {{ order.estado_pedido }}
                </span>
                </td>
                <!-- Return Status Column -->
                <td class="px-6 py-4">
                    <span *ngIf="order.estado_devolucion && order.estado_devolucion !== 'NINGUNA'" 
                          class="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                          [ngClass]="{
                              'bg-yellow-100 text-yellow-800': order.estado_devolucion === 'PENDIENTE',
                              'bg-green-100 text-green-800': order.estado_devolucion === 'APROBADA',
                              'bg-red-100 text-red-800': order.estado_devolucion === 'RECHAZADA',
                              'bg-purple-100 text-purple-800': order.estado_devolucion === 'RECIBIDA',
                              'bg-blue-100 text-blue-800': order.estado_devolucion === 'REEMBOLSADA'
                          }">
                        {{ order.estado_devolucion }}
                    </span>
                    <span *ngIf="!order.estado_devolucion || order.estado_devolucion === 'NINGUNA'" class="text-gray-400 text-xs">-</span>
                </td>
                <td class="px-6 py-4 text-right">
                <button (click)="openModal(order)" class="text-blue-600 hover:text-blue-800 font-medium cursor-pointer focus:outline-none underline">
                    Ver
                </button>
                </td>
            </tr>
            <tr *ngIf="orders.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  <div class="flex flex-col items-center justify-center">
                    <span class="text-2xl mb-2">🔍</span>
                    <p>No se encontraron pedidos con estos filtros</p>
                  </div>
                </td>
            </tr>
            </tbody>
        </table>
        
        <!-- Pagination Footer -->
        <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6" *ngIf="total > 0">
             <div class="flex-1 flex justify-between sm:hidden">
                <button (click)="changePage(currentPage - 1)" [disabled]="currentPage === 1" class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                  Anterior
                </button>
                <button (click)="changePage(currentPage + 1)" [disabled]="currentPage === totalPages" class="relative ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                  Siguiente
                </button>
             </div>
             <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700">
                    Mostrando página <span class="font-medium">{{ currentPage }}</span> de <span class="font-medium">{{ totalPages }}</span>
                    (<span class="font-medium">{{ total }}</span> resultados)
                  </p>
                </div>
                <div>
                  <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button (click)="changePage(currentPage - 1)" [disabled]="currentPage === 1" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      <span class="sr-only">Anterior</span>
                      &lt;
                    </button>
                     <!-- Page Numbers (Simplified) -->
                    <button *ngFor="let p of [currentPage]" class="relative inline-flex items-center px-4 py-2 border border-blue-500 bg-blue-50 text-sm font-medium text-blue-600">
                        {{ p }}
                    </button>
                    <button (click)="changePage(currentPage + 1)" [disabled]="currentPage === totalPages" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                      <span class="sr-only">Siguiente</span>
                      &gt;
                    </button>
                  </nav>
                </div>
             </div>
        </div>
        </div>
    </div>

    <!-- Modal -->
    <app-order-detail-modal 
        [isOpen]="isModalOpen" 
        [order]="selectedOrder" 
        (close)="isModalOpen = false">
    </app-order-detail-modal>
  `,
  styles: []
})
export class RecentOrdersTableComponent {
  @Input() orders: any[] = [];
  @Input() total: number = 0;
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;

  @Output() pageChange = new EventEmitter<number>();
  @Output() filterChange = new EventEmitter<{ status: string, customerType: string, paymentStatus: string }>();

  isModalOpen = false;
  selectedOrder: any = null;

  // Filter States (Local)
  selectedStatus = 'Todos';
  selectedCustomerType = 'Todos';
  selectedPaymentStatus = 'Todos'; // New

  statuses = ['Todos', 'PENDIENTE', 'PREPARADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
  paymentStatuses = ['Todos', 'PAGADO', 'PENDIENTE_CONFIRMACION', 'RECHAZADO', 'NO_PAGADO', 'REEMBOLSADO'];
  customerTypes = ['Todos', 'MAYORISTA', 'MINORISTA'];

  openModal(order: any) {
    this.selectedOrder = order;
    this.isModalOpen = true;
  }

  onFilterChange() {
    this.filterChange.emit({
      status: this.selectedStatus,
      customerType: this.selectedCustomerType,
      paymentStatus: this.selectedPaymentStatus // Emit new filter
    });
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= Math.ceil(this.total / this.pageSize)) {
      this.pageChange.emit(newPage);
    }
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PREPARADO': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'ENVIADO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ENTREGADO': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELADO': return 'bg-red-100 text-red-800 border-red-200';
      case 'DEVOLUCION_APROBADA': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DEVOLUCION_RECHAZADA': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'PAGADO': return 'bg-green-100 text-green-800 border border-green-200';
      case 'PENDIENTE_CONFIRMACION': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'RECHAZADO':
      case 'NO_PAGADO': return 'bg-red-100 text-red-800 border border-red-200';
      case 'REEMBOLSADO': return 'bg-gray-100 text-gray-800 border border-gray-200 line-through';
      default: return 'bg-gray-50 text-gray-500 border border-gray-200';
    }
  }
}
