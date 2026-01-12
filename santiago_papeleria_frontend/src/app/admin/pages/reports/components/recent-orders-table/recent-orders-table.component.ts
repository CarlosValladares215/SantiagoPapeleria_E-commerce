import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderDetailModalComponent } from '../order-detail-modal/order-detail-modal.component';

@Component({
  selector: 'app-recent-orders-table',
  standalone: true,
  imports: [CommonModule, OrderDetailModalComponent],
  template: `
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50 border-b">
          <tr>
            <th scope="col" class="px-6 py-3">ID Pedido</th>
            <th scope="col" class="px-6 py-3">Cliente</th>
            <th scope="col" class="px-6 py-3">Fecha</th>
            <th scope="col" class="px-6 py-3">Total</th>
            <th scope="col" class="px-6 py-3">Estado</th>
            <th scope="col" class="px-6 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let order of orders" class="bg-white border-b hover:bg-gray-50">
            <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
              #{{ order.numero_pedido_web }}
            </td>
            <td class="px-6 py-4">
              {{ order.usuario_id?.nombre || 'Cliente' }} {{ order.usuario_id?.apellido || '' }}
            </td>
            <td class="px-6 py-4">
              {{ order.fecha_compra | date:'shortDate' }}
            </td>
            <td class="px-6 py-4 font-semibold text-gray-900">
              {{ order.resumen_financiero.total_pagado | currency }}
            </td>
            <td class="px-6 py-4">
              <span [ngClass]="getStatusClass(order.estado_pedido)" class="px-2.5 py-0.5 rounded-full text-xs font-medium border">
                {{ order.estado_pedido }}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button (click)="openModal(order)" class="text-blue-600 hover:text-blue-900 font-medium cursor-pointer focus:outline-none">
                Ver
              </button>
            </td>
          </tr>
          <tr *ngIf="orders.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-500">
              No hay pedidos recientes
            </td>
          </tr>
        </tbody>
      </table>
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

  isModalOpen = false;
  selectedOrder: any = null;

  openModal(order: any) {
    this.selectedOrder = order;
    this.isModalOpen = true;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PAGADO': return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ENVIADO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ENTREGADO': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELADO': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }
}
