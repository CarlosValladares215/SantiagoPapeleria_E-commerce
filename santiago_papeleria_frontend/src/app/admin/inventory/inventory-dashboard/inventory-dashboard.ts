import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ErpService } from '../../../services/erp/erp.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inventory-dashboard.html',
  styleUrl: './inventory-dashboard.scss'
})
export class InventoryDashboardComponent implements OnInit {
  isLoading = signal(true);
  stats = signal<any>({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    normalStock: 0,
    timestamp: new Date()
  });

  constructor(private erpService: ErpService) { }

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.isLoading.set(true);

    // ForkJoin for parallel loading
    this.erpService.getInventoryStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading inventory stats', err);
        this.isLoading.set(false);
      }
    });

    this.loadMovements();
  }

  movements = signal<any[]>([]);

  loadMovements() {
    this.erpService.getRecentMovements().subscribe({
      next: (data) => this.movements.set(data),
      error: (err) => console.error('Error loading movements', err)
    });
  }

  getStatusBadgeClass(type: string): string {
    switch (type) {
      case 'VENTA': return 'bg-blue-100 text-blue-800';
      case 'SYNC_ERP': return 'bg-purple-100 text-purple-800';
      case 'DEVOLUCION': return 'bg-orange-100 text-orange-800';
      case 'AJUSTE_MANUAL': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
