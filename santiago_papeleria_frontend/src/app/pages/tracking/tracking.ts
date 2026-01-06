import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService, Order } from '../../services/order/order.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tracking.html',
  styleUrl: './tracking.scss',
})
export class Tracking implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private authService = inject(AuthService);

  searchQuery = '';
  order = signal<Order | null>(null);
  loading = signal(false);
  error = signal('');

  // Timeline Steps Definition
  readonly allSteps = [
    { status: 'Pendiente', label: 'Pedido Recibido', icon: 'ri-check-line', desc: 'Tu pedido ha sido confirmado' },
    { status: 'Preparando', label: 'En preparación', icon: 'ri-box-3-line', desc: 'Enviado a Bodega DobraNet para preparación' },
    { status: 'Enviado', label: 'Enviado', icon: 'ri-truck-line', desc: 'Tu pedido está en camino' },
    { status: 'Entregado', label: 'Entregado', icon: 'ri-home-4-line', desc: 'Pedido entregado con éxito' }
  ];

  // Dynamic steps based on current status
  get steps() {
    const currentStatus = this.order()?.estado_pedido || 'Pending';

    // Normalize function for comparison
    const normalize = (s: string) => s.toLowerCase().trim();

    const statusOrder = ['Pendiente', 'Preparando', 'Enviado', 'Entregado'];

    // Find index ignoring case
    let currentIndex = statusOrder.findIndex(s => normalize(s) === normalize(currentStatus));

    // Fallback logic: 
    // If status is 'Pagado', treat as 'Pendiente' (index 0)
    if (currentIndex === -1 && normalize(currentStatus) === 'pagado') {
      currentIndex = 0;
    }

    // If still not found, show at least the first step (Pending) or handle error
    if (currentIndex === -1) currentIndex = 0;

    // Filter steps up to current index
    return this.allSteps.filter((_, index) => index <= currentIndex);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.searchQuery = id;
        this.fetchOrder(id);
      }
    });
  }

  performSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { id: this.searchQuery },
        queryParamsHandling: 'merge',
      });
    }
  }

  fetchOrder(id: string) {
    this.loading.set(true);
    this.error.set('');
    this.order.set(null);

    const userId = this.authService.user()?._id;

    this.orderService.getOrderById(id, userId).subscribe({
      next: (data) => {
        this.order.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching order', err);
        // Handle 403 specifically if needed, or generic error
        if (err.status === 403) {
          this.error.set('No tienes permiso para ver este pedido.');
        } else {
          this.error.set('No se encontró el pedido o hubo un error al buscarlo.');
        }
        this.loading.set(false);
      }
    });
  }

  // Helper to determine step state
  getStepState(stepStatus: string): 'completed' | 'current' | 'pending' {
    const currentStatus = this.order()?.estado_pedido || 'Pendiente';

    const normalize = (s: string) => s.toLowerCase().trim();
    const statusOrder = ['Pendiente', 'Preparando', 'Enviado', 'Entregado'];

    let currentIndex = statusOrder.findIndex(s => normalize(s) === normalize(currentStatus));
    // Fallback for Pagado
    if (currentIndex === -1 && normalize(currentStatus) === 'pagado') currentIndex = 0;
    if (currentIndex === -1) currentIndex = 0;

    const stepIndex = statusOrder.findIndex(s => normalize(s) === normalize(stepStatus));

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  }

  getStepDate(stepStatus: string): Date | null {
    // In a real app, you'd store dates for each status transition.
    // For now, we'll return the purchase date for 'Pendiente' and null for others
    // unless you have specific fields in the backend.
    if (stepStatus === 'Pendiente') return this.order()?.fecha_compra || null;
    return null;
  }

  openInvoice() {
    const orderNum = this.order()?.numero_pedido_web;
    if (orderNum) {
      const url = this.router.serializeUrl(
        this.router.createUrlTree(['/orders/invoice', orderNum])
      );
      window.open(url, '_blank');
    }
  }
}
