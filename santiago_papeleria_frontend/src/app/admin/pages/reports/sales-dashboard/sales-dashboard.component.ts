import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportesService, DashboardStats, TopProduct } from '../../../../services/reportes.service';
import { KpiCardComponent } from '../components/kpi-card/kpi-card.component';
import { SalesChartComponent } from '../components/sales-chart/sales-chart.component';
import { TopProductsTableComponent } from '../components/top-products-table/top-products-table.component';
import { RecentOrdersTableComponent } from '../components/recent-orders-table/recent-orders-table.component';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    KpiCardComponent,
    SalesChartComponent,
    TopProductsTableComponent,
    RecentOrdersTableComponent
  ],
  templateUrl: './sales-dashboard.component.html',
  styleUrls: ['./sales-dashboard.component.scss']
})
export class SalesDashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;
  topProducts: TopProduct[] = [];
  recentOrders: any[] = [];
  isLoading = true;
  lastUpdate: Date = new Date();

  private refreshSubscription: Subscription | null = null;
  dateRanges = [
    { label: 'Hoy', value: 'hoy' },
    { label: 'Ayer', value: 'ayer' },
    { label: 'Últimos 7 días', value: '7d' },
    { label: 'Últimos 30 días', value: '30d' },
    { label: 'Todo el tiempo', value: 'all' }
  ];
  selectedRange = 'hoy';
  showExportMenu = false;

  constructor(
    private reportesService: ReportesService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.startAutoRefresh();
    this.loadTopProducts();
    this.loadRecentOrders();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  startAutoRefresh() {
    this.refreshSubscription = interval(300000)
      .pipe(
        startWith(0),
        switchMap(() => this.reportesService.getDashboardStats(this.selectedRange))
      )
      .subscribe({
        next: (data) => {
          this.stats = data;
          this.lastUpdate = new Date();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching dashboard stats', err);
          this.isLoading = false;
        }
      });
  }

  loadTopProducts() {
    this.reportesService.getTopProducts(10).subscribe(products => {
      this.topProducts = products;
      this.cdr.detectChanges();
    });
  }

  loadRecentOrders() {
    this.reportesService.getRecentOrders(20).subscribe((orders: any[]) => {
      this.recentOrders = orders;
      this.cdr.detectChanges();
    });
  }

  onRangeChange(range: string) {
    this.selectedRange = range;
    this.isLoading = true;
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    this.startAutoRefresh();
  }

  exportReport(format: 'pdf' | 'excel') {
    this.reportesService.exportReport(format, { range: this.selectedRange }).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
