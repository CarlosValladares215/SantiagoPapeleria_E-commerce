import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link?: string;
}

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    isSidebarOpen = signal(true);
    isNotificationsOpen = signal(false);

    // Mock notifications for now, can be moved to a service later
    notifications = signal<Notification[]>([
        {
            id: 'notif-001',
            type: 'error',
            title: 'Error en sincronización',
            message: '3 productos con errores de validación',
            timestamp: 'Hace 5 minutos',
            read: false,
            link: '/admin/erp-sync/logs'
        },
        {
            id: 'notif-003',
            type: 'success',
            title: 'Sincronización completada',
            message: '1,247 productos actualizados exitosamente',
            timestamp: 'Hace 2 horas',
            read: true,
            link: '/admin/erp-sync/dashboard'
        }
    ]);

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
            icon: 'ri-refresh-line',
            label: 'Sincronización ERP',
            path: '/admin/erp-sync',
            children: [
                { label: 'Dashboard', path: '/admin/erp-sync/dashboard' },
                { label: 'Manual', path: '/admin/erp-sync/manual' },
                { label: 'Logs', path: '/admin/erp-sync/logs' },
                { label: 'Configuración', path: '/admin/erp-sync/config' }
            ]
        },
        {
            icon: 'ri-settings-line',
            label: 'Configuración',
            path: '/admin/settings'
        },
        {
            icon: 'ri-logout-box-line',
            label: 'Cerrar Sesión',
            action: 'logout'
        }
    ];

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
        this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    }

    clearAllNotifications() {
        if (confirm('¿Eliminar todas las notificaciones?')) {
            this.notifications.set([]);
            this.isNotificationsOpen.set(false);
        }
    }

    handleNotificationClick(notification: Notification) {
        this.notifications.update(list =>
            list.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
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
