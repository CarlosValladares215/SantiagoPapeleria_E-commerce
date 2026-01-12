import { Component, ViewChild, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType, Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
    selector: 'app-sales-chart',
    standalone: true,
    imports: [CommonModule, BaseChartDirective],
    template: `
    <div class="relative w-full h-full min-h-[250px]">
      <canvas baseChart
        [data]="lineChartData"
        [options]="lineChartOptions"
        [type]="'line'"
        (chartHover)="chartHovered($event)"
        (chartClick)="chartClicked($event)">
      </canvas>
    </div>
  `,
    styles: []
})
export class SalesChartComponent implements OnChanges {
    @Input() data: any[] = [];
    @Input() labels: string[] = [];

    public lineChartData: ChartConfiguration<'line'>['data'] = {
        labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        datasets: [
            {
                data: [65, 59, 80, 81, 56, 55, 40],
                label: 'Ventas ($)',
                fill: true,
                tension: 0.4,
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }
        ]
    };

    public lineChartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            x: { grid: { display: false } },
            y: {
                min: 0,
                grid: { color: '#f3f4f6' }
            }
        }
    };

    public lineChartType: ChartType = 'line';

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['data'] && this.data) {
            this.lineChartData = {
                labels: this.labels.length > 0 ? this.labels : [],
                datasets: [
                    {
                        data: this.data,
                        label: 'Ventas ($)',
                        fill: true,
                        tension: 0.4,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                ]
            };
        }
    }

    public chartClicked({ event, active }: { event?: any, active?: any[] }): void {
        // using any for event/active to bypass strictness issues if needed, or precise type if available
    }

    public chartHovered({ event, active }: { event?: any, active?: any[] }): void {
    }
}
