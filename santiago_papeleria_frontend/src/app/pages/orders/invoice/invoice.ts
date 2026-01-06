import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OrderService, Order } from '../../../services/order/order.service';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
    selector: 'app-invoice',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './invoice.html',
    styleUrl: './invoice.scss'
})
export class Invoice implements OnInit {
    private route = inject(ActivatedRoute);
    private orderService = inject(OrderService);
    public authService = inject(AuthService);

    order = signal<Order | null>(null);
    loading = signal(true);
    error = signal('');

    ngOnInit() {
        this.route.params.subscribe(params => {
            const id = params['id'];
            if (id) {
                this.fetchOrder(id);
            } else {
                this.error.set('Número de pedido inválido');
                this.loading.set(false);
            }
        });
    }

    fetchOrder(id: string) {
        const userId = this.authService.user()?._id;

        this.orderService.getOrderById(id, userId).subscribe({
            next: (data) => {
                this.order.set(data);
                this.loading.set(false);
                // Auto print after a short delay to ensure rendering
                setTimeout(() => {
                    window.print();
                }, 500);
            },
            error: (err) => {
                console.error('Error fetching order for invoice', err);
                this.error.set('No se pudo cargar el pedido. Verifique el número.');
                this.loading.set(false);
            }
        });
    }

    print() {
        window.print();
    }
}
