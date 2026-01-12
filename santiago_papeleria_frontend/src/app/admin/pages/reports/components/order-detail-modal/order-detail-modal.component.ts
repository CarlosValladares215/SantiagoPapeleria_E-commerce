import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-order-detail-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="close.emit()"></div>

      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          
          <!-- Header -->
          <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 border-b">
            <div class="sm:flex sm:items-start justify-between">
              <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <h3 class="text-xl font-semibold leading-6 text-gray-900" id="modal-title">
                  Pedido #{{ order?.numero_pedido_web }}
                </h3>
                <div class="mt-1 flex gap-2 text-sm text-gray-500">
                    <span>{{ order?.fecha_compra | date:'medium' }}</span>
                    <span>•</span>
                    <span [ngClass]="getStatusClass(order?.estado_pedido)">{{ order?.estado_pedido }}</span>
                </div>
              </div>
              <button (click)="close.emit()" class="text-gray-400 hover:text-gray-500 focus:outline-none">
                <span class="text-2xl">&times;</span>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="bg-white px-4 py-5 sm:p-6">
            
            <!-- Customer & Shipping -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Cliente</h4>
                    <p class="font-medium text-gray-900">{{ order?.usuario_id?.nombre }} {{ order?.usuario_id?.apellido }}</p>
                    <p class="text-gray-600 text-sm">{{ order?.usuario_id?.email }}</p>
                    <p class="text-gray-600 text-sm">{{ order?.usuario_id?.telefono }}</p>
                </div>
                
                <div>
                    <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Envío</h4>
                    <p class="text-gray-900 text-sm is-truncated">
                        {{ order?.direccion_envio?.calle_principal }} {{ order?.direccion_envio?.numero }}
                    </p>
                    <p class="text-gray-600 text-sm">
                        {{ order?.direccion_envio?.referencia }}
                    </p>
                    <p class="text-gray-600 text-sm">
                        {{ order?.direccion_envio?.ciudad }}, {{ order?.direccion_envio?.provincia }}
                    </p>
                </div>
            </div>

            <!-- Items Table -->
            <h4 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Productos</h4>
            <div class="border rounded-lg overflow-hidden mb-6">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cant.</th>
                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                            <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 bg-white">
                        <tr *ngFor="let item of order?.items">
                            <td class="px-4 py-2 text-sm text-gray-900">{{ item.nombre }}</td>
                            <td class="px-4 py-2 text-sm text-gray-500 text-right">{{ item.cantidad }}</td>
                            <td class="px-4 py-2 text-sm text-gray-500 text-right">{{ item.precio | currency }}</td>
                            <td class="px-4 py-2 text-sm text-gray-900 font-medium text-right">{{ item.subtotal | currency }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Totals -->
            <div class="flex justify-end">
                <div class="w-full md:w-1/2 bg-gray-50 p-4 rounded-lg">
                    <div class="flex justify-between py-1 text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span>{{ order?.resumen_financiero?.subtotal | currency }}</span>
                    </div>
                    <div class="flex justify-between py-1 text-sm text-gray-600">
                        <span>Envío:</span>
                        <span>{{ order?.resumen_financiero?.costo_envio | currency }}</span>
                    </div>
                    <div *ngIf="order?.resumen_financiero?.descuento > 0" class="flex justify-between py-1 text-sm text-green-600">
                        <span>Descuento:</span>
                        <span>-{{ order?.resumen_financiero?.descuento | currency }}</span>
                    </div>
                    <div class="flex justify-between py-2 mt-2 border-t font-bold text-lg text-gray-900">
                        <span>Total Pagado:</span>
                        <span>{{ order?.resumen_financiero?.total_pagado | currency }}</span>
                    </div>
                </div>
            </div>

          </div>
          
          <!-- Footer -->
          <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button type="button" (click)="close.emit()" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .is-truncated {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
  `]
})
export class OrderDetailModalComponent {
    @Input() order: any = null;
    @Input() isOpen = false;
    @Output() close = new EventEmitter<void>();

    getStatusClass(status: string): string {
        const base = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full ";
        switch (status) {
            case 'PAGADO': return base + 'bg-green-100 text-green-800';
            case 'ENTREGADO': return base + 'bg-blue-100 text-blue-800';
            case 'PENDIENTE': return base + 'bg-yellow-100 text-yellow-800';
            case 'CANCELADO': return base + 'bg-red-100 text-red-800';
            default: return base + 'bg-gray-100 text-gray-800';
        }
    }
}
