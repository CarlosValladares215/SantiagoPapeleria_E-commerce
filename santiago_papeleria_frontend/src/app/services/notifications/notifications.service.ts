
import { Injectable, signal, effect, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface Notification {
    _id: string;
    usuario_id: string;
    titulo: string;
    mensaje: string;
    tipo: string;
    leido: boolean;
    metadata?: any;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationsService {
    private apiUrl = environment.apiUrl.replace('/productos', '') + '/notifications';

    // Signals
    notifications = signal<Notification[]>([]);
    unreadCount = computed(() => this.notifications().filter(n => !n.leido).length);

    constructor(private http: HttpClient, private auth: AuthService) {
        // Auto-fetch notifications when user logs in
        effect((onCleanup) => {
            const user = this.auth.user();
            if (user && user._id) {
                this.fetchNotifications(user._id);

                const interval = setInterval(() => {
                    // Use untracked to avoid cyclic dependency if user() updates within interval (unlikely but safe)
                    const currentUser = this.auth.user();
                    if (currentUser && currentUser._id) {
                        this.fetchNotifications(currentUser._id);
                    }
                }, 60000);

                onCleanup(() => {
                    clearInterval(interval);
                });
            } else {
                this.notifications.set([]);
            }
        });
    }

    fetchNotifications(userId: string) {
        console.log('🔔 [Front] Fetching notifications for User:', userId);
        this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`).subscribe({
            next: (data) => {
                console.log('✅ [Front] Notifications loaded:', data.length);
                setTimeout(() => {
                    this.notifications.set(data);
                });
            },
            error: (err) => console.error('❌ [Front] Error fetching notifications', err)
        });
    }

    markAsRead(id: string) {
        // Optimistic update
        this.notifications.update(list =>
            list.map(n => n._id === id ? { ...n, leido: true } : n)
        );

        this.http.patch(`${this.apiUrl}/${id}/read`, {}).subscribe({
            error: () => {
                // Revert if error (optional, skipping for simplicity)
                console.error('Error marking as read');
            }
        });
    }

    markAllAsRead(userId: string) {
        // Optimistic update
        this.notifications.update(list => list.map(n => ({ ...n, leido: true })));

        this.http.patch(`${this.apiUrl}/user/${userId}/read-all`, {}).subscribe({
            error: () => console.error('Error marking all as read')
        });
    }
}
