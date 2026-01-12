import { Component, computed, inject, signal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

import { AdminNotificationsService, Notification } from '../../services/admin-notifications/admin-notifications.service';

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-layout.component.html',
    styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
    private authService = inject(AuthService);
    private router = inject(Router);
    private notificationsService = inject(AdminNotificationsService);

    isSidebarOpen = signal(true);
    isNotificationsOpen = signal(false);

    // Use signal from service
    notifications: Signal<Notification[]> = this.notificationsService.notifications;

    unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

    user = this.authService.user;

    sidebarItems = [
        {
            icon: 'ri-dashboard-line',
            label: 'Dashboard',
            path: '/admin/dashboard'
        },
        {
            icon: 'ri-shopping-bag-line',
            label: 'Productos',
            path: '/admin/products'
        },
        {
            icon: 'ri-percent-line',
            label: 'Promociones',
            path: '/admin/promociones'
        },
        {
            icon: 'ri-truck-line',
            label: 'Config. Envíos',
            path: '/admin/shipping'
        },
        {
            icon: 'ri-secure-payment-line',
            label: 'Pagos',
            path: '/admin/payments'
        },
        {
            icon: 'ri-refresh-line',
            label: 'Sincronización ERP',
            path: '/admin/erp-sync',
            children: [
                { label: 'Manual', path: '/admin/erp-sync/manual' },
                { label: 'Logs', path: '/admin/erp-sync/logs' },
                { label: 'Configuración', path: '/admin/erp-sync/config' }
            ]
        },
        {
            icon: 'ri-file-chart-line',
            label: 'Reportes',
            path: '/admin/reports'
        },
        {
            icon: 'ri-logout-box-line',
            label: 'Cerrar Sesión',
            action: 'logout'
        }
    ];

    constructor() {
        // Fetch notifications on load
        this.notificationsService.fetchNotifications();
    }

    toggleSidebar() {
        this.isSidebarOpen.update(v => !v);
    }

    toggleNotifications() {
        this.isNotificationsOpen.update(v => !v);
    }

    handleLogout() {
        this.authService.logout();
    }

    handleClick(item: any) {
        if (item.action === 'logout') {
            this.handleLogout();
        }
    }

    markAllAsRead() {
        this.notificationsService.markAllAsRead();
    }

    clearAllNotifications() {
        if (confirm('¿Eliminar todas las notificaciones?')) {
            this.notificationsService.clearAll();
            this.isNotificationsOpen.set(false);
        }
    }

    handleNotificationClick(notification: Notification) {
        this.notificationsService.markAsRead(notification.id);

        if (notification.link) {
            this.router.navigate([notification.link]);
            this.isNotificationsOpen.set(false);
        }
    }

    getNotificationBg(type: string): string {
        switch (type) {
            case 'success': return 'bg-green-100';
            case 'error': return 'bg-red-100';
            case 'warning': return 'bg-yellow-100';
            case 'info': return 'bg-blue-100';
            default: return 'bg-gray-100';
        }
    }

    getNotificationIcon(type: string): string {
        switch (type) {
            case 'success': return 'ri-check-line text-green-600';
            case 'error': return 'ri-error-warning-line text-red-600';
            case 'warning': return 'ri-alert-line text-yellow-600';
            case 'info': return 'ri-information-line text-blue-600';
            default: return 'ri-notification-line text-gray-600';
        }
    }
}
