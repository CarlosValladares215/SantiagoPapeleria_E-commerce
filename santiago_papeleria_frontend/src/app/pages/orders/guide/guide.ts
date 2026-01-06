import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OrderService, Order } from '../../../services/order/order.service';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
    selector: 'app-guide',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './guide.html',
    styleUrl: './guide.scss'
})
export class GuideComponent implements OnInit {
    route = inject(ActivatedRoute);
    orderService = inject(OrderService);
    authService = inject(AuthService); // Public for template access if needed

    orderId: string | null = null;
    order: Order | null = null;
    currentDate = new Date();

    ngOnInit() {
        this.orderId = this.route.snapshot.paramMap.get('id');
        if (this.orderId) {
            this.loadOrder(this.orderId);
        }
    }

    loadOrder(id: string) {
        // For admins/warehouse, we might need a specific endpoint or just use getOrderById without userId restriction if backend allows
        // Assuming getOrderById can work without userId for admin or we pass a flag/admin ID.
        // However, existing service requires userId for security in some cases.
        // For now, let's try fetching it. Note: Warehouse dashboard uses a different service or method?
        // Looking at dashboard.component.ts might clarify, but let's assume we can fetch by ID.
        // Actually, dashboard likely has the full order object.

        // Simplification: We fetch by ID. If backend restricts, we might need to adjust.
        // Since this is a new requirement for Bodega, they likely have admin privileges.

        this.orderService.getOrderById(id).subscribe({
            next: (order) => {
                console.log('✅ [GuideComponent] Pedido cargado:', order);
                this.order = order;
                // Auto-print after a short delay to allow rendering
                setTimeout(() => {
                    console.log('🖨️ [GuideComponent] Intentando imprimir...');
                    window.print();
                }, 500);
            },
            error: (err) => {
                console.error('❌ [GuideComponent] Error loading order for guide:', err);
                alert('Error al cargar datos de la guía. Consulta la consola.');
            }
        });
    }
}
