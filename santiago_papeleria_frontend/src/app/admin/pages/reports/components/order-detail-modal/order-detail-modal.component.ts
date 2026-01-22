import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportesService } from '../../../../../services/reportes.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-order-detail-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-50 overflow-y-auto print:absolute print:inset-0 print:z-auto print:overflow-visible" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <!-- Backdrop (Hidden on Print) -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity print:hidden" (click)="close.emit()"></div>

      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0 print:block print:p-0">
        <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl print:shadow-none print:w-full print:max-w-none print:my-0 print:rounded-none">
          
          <!-- Actions Header (Hidden on Print) -->
          <div class="bg-gray-50 px-4 py-3 flex justify-between items-center border-b print:hidden">
            <h3 class="text-lg font-medium text-gray-900">Detalle del Pedido #{{ order?.numero_pedido_web }}</h3>
            
            <div class="flex items-center gap-3">
                 <!-- Status Controls -->
                 <div class="flex gap-2 mr-4">
                    <!-- Payment Status Badge -->
                    <span class="px-2 py-1 text-xs font-bold rounded-full border"
                        [ngClass]="{
                            'bg-red-100 text-red-800 border-red-200': order?.estado_pago === 'NO_PAGADO' || order?.estado_pago === 'RECHAZADO',
                            'bg-yellow-100 text-yellow-800 border-yellow-200': order?.estado_pago === 'PENDIENTE_CONFIRMACION',
                            'bg-green-100 text-green-800 border-green-200': order?.estado_pago === 'PAGADO'
                        }">
                        {{ order?.estado_pago || 'NO_PAGADO' }}
                    </span>

                    <!-- Payment Action Button -->
                    <button *ngIf="order?.estado_pago !== 'PAGADO'" 
                            (click)="confirmarPago()"
                            [disabled]="isUpdating"
                            class="bg-green-600 text-white text-xs px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 transition-colors">
                        <i class="ri-money-dollar-circle-line"></i> 
                        {{ isUpdating ? 'Procesando...' : 'Confirmar Pago' }}
                    </button>
                    <!-- Return Actions (Admin - Only Finalize) -->
                    <div class="flex gap-2" *ngIf="order?.estado_devolucion && order?.estado_devolucion !== 'NINGUNA'">
                         <!-- Admin Finalize (Step 4) -->
                         <button *ngIf="order?.estado_devolucion === 'RECIBIDA'" 
                                (click)="finalizeReturn()"
                                [disabled]="isUpdating"
                                class="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 transition-colors">
                            <i class="ri-refund-2-line"></i> 
                            {{ isUpdating ? 'Procesando...' : 'Finalizar Reembolso' }}
                        </button>
                    </div>

                 </div>

                <div class="h-6 w-px bg-gray-300"></div>

                <button (click)="print()" class="bg-[#012e40] text-white px-4 py-2 rounded font-bold hover:bg-[#0f4c75] flex items-center gap-2">
                    <i class="ri-printer-line"></i> Imprimir
                </button>
                <button (click)="close.emit()" class="text-gray-400 hover:text-gray-500 text-2xl px-2">
                    &times;
                </button>
            </div>
          </div>

          <!-- Return Request Alert (ABOVE INVOICE) -->
          <div class="bg-amber-50 border-l-4 border-amber-400 p-4 mx-8 md:mx-12 mt-4" *ngIf="order?.estado_devolucion && order?.estado_devolucion !== 'NINGUNA'">
              <div class="flex items-start">
                  <div class="flex-shrink-0">
                      <span class="text-2xl">⚠️</span>
                  </div>
                  <div class="ml-3 w-full">
                      <div class="flex justify-between items-center mb-2">
                          <h3 class="text-sm font-bold text-amber-800">Solicitud de Devolución</h3>
                          <span class="px-2 py-1 rounded text-xs font-bold"
                                [ngClass]="{
                                    'bg-yellow-200 text-yellow-800': order?.estado_devolucion === 'PENDIENTE',
                                    'bg-green-200 text-green-800': order?.estado_devolucion === 'APROBADA',
                                    'bg-red-200 text-red-800': order?.estado_devolucion === 'RECHAZADA',
                                    'bg-purple-200 text-purple-800': order?.estado_devolucion === 'RECIBIDA',
                                    'bg-blue-200 text-blue-800': order?.estado_devolucion === 'REEMBOLSADA'
                                }">
                              {{ order?.estado_devolucion }}
                          </span>
                      </div>
                      <div class="text-sm text-amber-700">
                          <p class="mb-1"><strong>Motivo:</strong> "{{ order?.datos_devolucion?.motivo || 'No especificado' }}"</p>
                          <p class="text-xs text-amber-600">Solicitud realizada: {{ (order?.datos_devolucion?.fecha_solicitud || order?.updatedAt) | date:'d MMM yyyy, HH:mm' }}</p>
                      </div>
                      <div class="mt-2 text-sm text-amber-600" *ngIf="order?.datos_devolucion?.observaciones_bodega">
                          <strong>Observaciones:</strong> {{ order?.datos_devolucion?.observaciones_bodega }}
                      </div>
                  </div>
              </div>
          </div>

          <!-- Invoice Body (Unified Design) -->
          <div class="p-8 md:p-12 print:p-0 bg-white" id="invoice">
            
            <!-- Invoice Header -->
            <div class="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
                <div>
                    <h1 class="text-4xl font-bold text-[#012e40] mb-2 uppercase tracking-wide">Factura</h1>
                    <p class="text-gray-500 font-medium">Comprobante de Venta</p>
                    
                    <!-- Triple State Badges in Invoice -->
                    <div class="mt-4 flex flex-col gap-1 items-start">
                         <!-- Logistic Status -->
                         <span class="px-3 py-1 rounded-full text-sm font-bold border inline-block" 
                            [ngClass]="{
                                'bg-green-100 text-green-800 border-green-200': order?.estado_pedido === 'ENTREGADO',
                                'bg-yellow-100 text-yellow-800 border-yellow-200': order?.estado_pedido !== 'ENTREGADO'
                            }">
                            Logística: {{ order?.estado_pedido }}
                        </span>
                        
                        <!-- Return Status (Only if exists) -->
                        <span *ngIf="order?.estado_devolucion && order?.estado_devolucion !== 'NINGUNA'"
                              class="px-3 py-1 rounded-full text-sm font-bold border bg-purple-100 text-purple-800 border-purple-200 inline-block">
                            Devolución: {{ order?.estado_devolucion }}
                        </span>
                    </div>
                </div>
                <div class="text-right">
                    <h2 class="text-2xl font-bold text-gray-800">Santiago Papelería</h2>
                    <p class="text-sm text-gray-600 mt-1">Av. Pío Jaramillo Alvarado y Venezuela</p>
                    <p class="text-sm text-gray-600">Loja, Ecuador</p>
                    <p class="text-sm text-gray-600">Tel: (02) 123-4567</p>
                    <p class="text-sm text-gray-600">RUC: 1104567890001</p>
                    <p class="text-sm text-gray-600">info@santiagopapeleria.com</p>
                </div>
            </div>

            <!-- Info Grid -->
            <div class="grid grid-cols-2 gap-12 mb-10 text-left">
                <div>
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cliente</h3>
                    <div class="border-l-4 border-[#012e40] pl-4">
                        <p class="font-bold text-gray-800 text-lg">
                            {{ order?.usuario_id?.razon_social || ((order?.usuario_id?.nombre || '') + ' ' + (order?.usuario_id?.apellido || '')) || 'Cliente Final' }}
                        </p>
                        <p class="text-gray-600">{{ order?.usuario_id?.email }}</p>
                        <p class="text-gray-600 text-sm mt-1" *ngIf="order?.usuario_id?.identificacion">
                            <span class="font-medium">RUC/CI:</span> {{ order?.usuario_id?.identificacion }}
                        </p>
                         <p class="text-gray-600 text-sm" *ngIf="order?.usuario_id?.telefono">
                            <span class="font-medium">Tel:</span> {{ order?.usuario_id?.telefono }}
                        </p>
                         <p class="text-gray-600 text-sm" *ngIf="order?.usuario_id?.direccion_fiscal">
                            <span class="font-medium">Dir:</span> {{ order?.usuario_id?.direccion_fiscal }}
                        </p>
                    </div>

                    <div class="mt-6">
                        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Dirección de Envío</h3>
                        <div class="pl-4 border-l-4 border-gray-200 text-sm text-gray-600" *ngIf="order?.datos_envio?.direccion_destino; else noAddress">
                            <p class="font-medium text-gray-800">{{ order?.datos_envio?.direccion_destino?.calle }}</p>
                            <p>{{ order?.datos_envio?.direccion_destino?.referencia }}</p>
                            <p>
                                <span *ngIf="order?.datos_envio?.direccion_destino?.ciudad">{{ order?.datos_envio?.direccion_destino?.ciudad }}</span>
                                <span *ngIf="order?.datos_envio?.direccion_destino?.ciudad && order?.datos_envio?.direccion_destino?.provincia">, </span>
                                <span *ngIf="order?.datos_envio?.direccion_destino?.provincia">{{ order?.datos_envio?.direccion_destino?.provincia }}</span>
                            </p>
                        </div>
                        <ng-template #noAddress>
                            <p class="text-sm text-gray-400 italic pl-4">Misma del cliente / No registrada</p>
                        </ng-template>
                    </div>
                </div>
                
                <div class="text-right">
                    <div class="mb-6 bg-gray-50 p-4 rounded-lg inline-block text-left min-w-[200px]">
                        <div class="mb-2">
                             <span class="block text-xs font-bold text-gray-500 uppercase">Número de Pedido</span>
                             <span class="block font-mono text-xl font-bold text-[#012e40]">#{{ order?.numero_pedido_web }}</span>
                        </div>
                        <div>
                             <span class="block text-xs font-bold text-gray-500 uppercase">Fecha de Emisión</span>
                             <span class="block font-medium text-gray-800">{{ order?.fecha_compra | date:'d MMMM, yyyy' }}</span>
                        </div>
                         <div class="mt-2 text-right">
                             <span class="text-xs font-bold uppercase" 
                                [ngClass]="{'text-green-600': order?.estado_pago === 'PAGADO', 'text-red-500': order?.estado_pago !== 'PAGADO'}">
                                {{ order?.estado_pago === 'PAGADO' ? 'PAGADO' : 'NO PAGADO' }}
                             </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <table class="w-full mb-10 text-left">
                <thead>
                    <tr class="border-b-2 border-gray-100">
                        <th class="py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción</th>
                        <th class="py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center w-24">Cant.</th>
                        <th class="py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right w-32">Precio Unit.</th>
                        <th class="py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right w-32">Total</th>
                    </tr>
                </thead>
                <tbody class="text-sm text-gray-700">
                    <tr *ngFor="let item of order?.items" class="border-b border-gray-50">
                        <td class="py-4">
                            <p class="font-bold text-gray-800">{{ item.nombre }}</p>
                            <p class="text-xs text-gray-400" *ngIf="item.codigo_dobranet">Cód: {{ item.codigo_dobranet }}</p>
                        </td>
                        <td class="py-4 text-center">{{ item.cantidad }}</td>
                        <td class="py-4 text-right">{{ item.precio_unitario_aplicado | currency }}</td>
                        <td class="py-4 text-right font-bold text-gray-800">{{ item.subtotal | currency }}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Totals -->
            <div class="flex justify-end mb-12">
                <div class="w-72">
                    <div class="flex justify-between mb-2 text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span class="font-medium">{{ order?.resumen_financiero?.subtotal_sin_impuestos | currency }}</span>
                    </div>
                    <div class="flex justify-between mb-2 text-sm text-gray-600">
                        <span>Costo de Envío</span>
                        <span class="font-medium">{{ order?.resumen_financiero?.costo_envio | currency }}</span>
                    </div>
                    <div class="flex justify-between mb-4 text-sm text-gray-600" *ngIf="order?.resumen_financiero?.total_impuestos > 0">
                        <span>IVA (15%)</span>
                        <span class="font-medium">{{ order?.resumen_financiero?.total_impuestos | currency }}</span>
                    </div>
                    <div class="flex justify-between pt-4 border-t-2 border-gray-800 text-xl font-bold text-[#012e40]">
                        <span>Total a Pagar</span>
                        <span>{{ order?.resumen_financiero?.total_pagado | currency }}</span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="text-center text-xs text-gray-400 border-t border-gray-100 pt-8 mt-12">
                <p class="mb-1 font-medium text-gray-500">Gracias por su compra en Santiago Papelería</p>
                <p>Este documento es un comprobante de pedido electrónico generado automáticamente.</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    @media print {
      @page { size: auto; }
      body { visibility: hidden; }
      #invoice { 
        visibility: visible; 
        position: absolute; 
        left: 0; 
        top: 0; 
        width: 100%; 
        padding: 20px;
        z-index: 9999;
        background: white;
      }
      app-root > *:not(app-order-detail-modal) {
        display: none;
      }
      /* Ensure modal scroll/fixed doesn't interfere */
      .fixed { position: static !important; overflow: visible !important; }
    }
  `]
})
export class OrderDetailModalComponent {
    @Input() isOpen = false;
    @Input() order: any;
    @Output() close = new EventEmitter<void>();
    @Output() statusChanged = new EventEmitter<void>(); // Notify parent to reload data

    private reportesService = inject(ReportesService);
    isUpdating = false;

    print() {
        window.print();
    }



    confirmarPago() {
        if (!this.order?._id) return;

        Swal.fire({
            title: '¿Confirmar Pago?',
            text: "Se marcará el pedido como PAGADO y se enviará la factura al cliente.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, confirmar pago',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.isUpdating = true;
                this.reportesService.updateOrderPaymentStatus(this.order._id, 'PAGADO').subscribe({
                    next: () => {
                        this.isUpdating = false;
                        this.order.estado_pago = 'PAGADO';
                        this.statusChanged.emit();
                        Swal.fire(
                            '¡Pago Confirmado!',
                            'La factura ha sido enviada al cliente.',
                            'success'
                        );
                    },
                    error: (err: any) => {
                        this.isUpdating = false;
                        console.error(err);
                        Swal.fire(
                            'Error',
                            'No se pudo actualizar el pago. Intente nuevamente.',
                            'error'
                        );
                    }
                });
            }
        });
    }

    finalizeReturn() {
        if (!this.order?._id) return;
        Swal.fire({
            title: '¿Finalizar Reembolso?',
            text: "Se marcará el pago como REEMBOLSADO y se cerrará el caso de devolución. Esta acción es irreversible.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, Finalizar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.isUpdating = true;
                this.reportesService.finalizeReturnedOrder(this.order._id).subscribe({
                    next: () => {
                        this.isUpdating = false;
                        this.order.estado_devolucion = 'REEMBOLSADA';
                        this.order.estado_pago = 'REEMBOLSADO';
                        this.statusChanged.emit();
                        Swal.fire('Finalizado', 'El reembolso ha sido procesado exitosamente.', 'success');
                    },
                    error: (err: any) => {
                        this.isUpdating = false;
                        console.error(err);
                        Swal.fire('Error', 'No se pudo finalizar el reembolso.', 'error');
                    }
                });
            }
        });
    }


}
