import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopProduct } from '../../../../../services/reportes.service';

@Component({
    selector: 'app-top-products-table',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="overflow-hidden">
      <table class="w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" class="px-3 py-2">#</th>
            <th scope="col" class="px-3 py-2">Producto</th>
            <th scope="col" class="px-3 py-2 text-right">Cant.</th>
            <th scope="col" class="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let product of products; let i = index" class="bg-white border-b hover:bg-gray-50">
            <td class="px-3 py-2 font-medium">
              <span [ngClass]="{
                'text-yellow-500': i === 0,
                'text-gray-400': i === 1,
                'text-orange-400': i === 2
              }">{{ i + 1 }}</span>
            </td>
            <td class="px-3 py-2 font-medium text-gray-900 truncate max-w-[150px]" title="{{product.nombre}}">
              {{ product.nombre }}
            </td>
            <td class="px-3 py-2 text-right">{{ product.unidades }}</td>
            <td class="px-3 py-2 text-right text-gray-900 font-semibold">{{ product.ingresos | currency }}</td>
          </tr>
          <tr *ngIf="products.length === 0">
            <td colspan="4" class="px-3 py-4 text-center text-gray-400">
              No hay datos disponibles
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
    styles: []
})
export class TopProductsTableComponent {
    @Input() products: TopProduct[] = [];
}
