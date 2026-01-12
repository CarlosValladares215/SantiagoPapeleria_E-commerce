import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Pipe for absolute value
import { Pipe, PipeTransform } from '@angular/core';
@Pipe({ name: 'abs', standalone: true })
export class AbsPipe implements PipeTransform {
  transform(num: number): number {
    return Math.abs(num);
  }
}

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, AbsPipe],
  template: `
    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-gray-500 text-sm font-medium">{{ title }}</p>
          <div class="mt-2 flex items-baseline gap-2">
            <h3 class="text-3xl font-bold text-gray-800" [class.animate-pulse]="loading">
              {{ loading ? '...' : value }}
            </h3>
          </div>
          <div class="mt-2 flex items-center text-sm" *ngIf="!loading">
            <span 
              [class.text-green-600]="change >= 0"
              [class.text-red-600]="change < 0"
              class="font-medium flex items-center"
            >
              {{ change >= 0 ? '↑' : '↓' }} {{ (change | abs) | number:'1.0-1' }}%
            </span>
            <span class="text-gray-400 ml-2">vs periodo anterior</span>
          </div>
        </div>
        <div class="p-3 bg-blue-50 rounded-lg text-blue-600">
           <!-- Simple Icon Placeholder -->
           <span class="text-xl">📊</span>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class KpiCardComponent {
  @Input() title: string = '';
  @Input() value: any = 0;
  @Input() change: number = 0;
  @Input() icon: string = '';
  @Input() loading: boolean = false;
}
