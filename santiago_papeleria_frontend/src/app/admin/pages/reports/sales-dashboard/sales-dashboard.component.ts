import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService, DailySnapshot, SalesData, TopProduct } from '../../../services/reports.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-sales-dashboard',
    standalone: true,
    imports: [CommonModule, BaseChartDirective, FormsModule],
    template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-6">Panel de Ventas</h1>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p class="text-gray-500 text-sm">Ventas de Hoy</p>
          <p class="text-3xl font-bold text-green-600">{{ dailySnapshot?.totalRevenue | currency }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p class="text-gray-500 text-sm">Pedidos de Hoy</p>
          <p class="text-3xl font-bold text-blue-600">{{ dailySnapshot?.totalOrders }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <p class="text-gray-500 text-sm">Ticket Promedio</p>
          <p class="text-3xl font-bold text-purple-600">{{ dailySnapshot?.avgTicket | currency }}</p>
        </div>
      </div>

      <!-- Filters & Actions -->
      <div class="flex flex-wrap gap-4 mb-6 items-center bg-white p-4 rounded-lg shadow-sm">
        <div class="flex items-center gap-2">
            <label class="text-sm font-medium">Desde:</label>
            <input type="date" [(ngModel)]="startDate" (change)="loadRangeData()" class="border rounded px-2 py-1 text-sm">
        </div>
        <div class="flex items-center gap-2">
            <label class="text-sm font-medium">Hasta:</label>
            <input type="date" [(ngModel)]="endDate" (change)="loadRangeData()" class="border rounded px-2 py-1 text-sm">
        </div>
        <button (click)="exportReport()" class="ml-auto bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800">
          Exportar Reporte
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Sales Chart -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 class="text-lg font-semibold mb-4">Tendencia de Ventas</h2>
          <div class="h-[300px]">
            <canvas baseChart
              [data]="lineChartData"
              [options]="lineChartOptions"
              [type]="'line'">
            </canvas>
          </div>
        </div>

        <!-- Top Products -->
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 class="text-lg font-semibold mb-4">Productos Más Vendidos</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th class="px-4 py-3">Producto</th>
                  <th class="px-4 py-3 text-right">Cant.</th>
                  <th class="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let product of topProducts" class="border-b hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-900 truncate max-w-[200px]" title="{{product.name}}">
                    {{ product.name }}
                  </td>
                  <td class="px-4 py-3 text-right">{{ product.totalSold }}</td>
                  <td class="px-4 py-3 text-right">{{ product.revenue | currency }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SalesDashboardComponent implements OnInit {
    private reportsService = inject(ReportsService);

    dailySnapshot: DailySnapshot | null = null;
    startDate: string = '';
    endDate: string = '';

    salesData: SalesData[] = [];
    topProducts: TopProduct[] = [];

    // Chart Configuration
    lineChartData: ChartConfiguration<'line'>['data'] = {
        labels: [],
        datasets: [
            {
                data: [],
                label: 'Ventas ($)',
                fill: true,
                tension: 0.4,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)'
            }
        ]
    };

    lineChartOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        }
    };

    ngOnInit() {
        this.initDates();
        this.loadDailySnapshot();
        this.loadRangeData();
    }

    initDates() {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30); // Last 30 days

        this.endDate = end.toISOString().split('T')[0];
        this.startDate = start.toISOString().split('T')[0];
    }

    loadDailySnapshot() {
        this.reportsService.getDailySnapshot().subscribe(data => {
            this.dailySnapshot = data;
        });
    }

    loadRangeData() {
        if (!this.startDate || !this.endDate) return;

        this.reportsService.getSalesByDateRange(this.startDate, this.endDate).subscribe(data => {
            this.salesData = data;
            this.updateChart();
        });

        this.reportsService.getTopSellingProducts(this.startDate, this.endDate).subscribe(data => {
            this.topProducts = data;
        });
    }

    updateChart() {
        this.lineChartData.labels = this.salesData.map(d => d._id);
        this.lineChartData.datasets[0].data = this.salesData.map(d => d.totalSales);

        // Force chart update reference
        this.lineChartData = { ...this.lineChartData };
    }

    exportReport() {
        // Export to Excel
        import('xlsx').then(xlsx => {
            const ws: any = xlsx.utils.json_to_sheet(this.salesData);
            const wb: any = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Ventas');
            xlsx.writeFile(wb, `Reporte_Ventas_${this.startDate}_${this.endDate}.xlsx`);
        });

        // TODO: Add PDF export if needed
    }
}
