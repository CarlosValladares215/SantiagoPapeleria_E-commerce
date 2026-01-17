import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../services/auth/auth.service';
import { NotificationsService } from '../../../../services/notifications/notifications.service';
import { UiService } from '../../../../services/ui/ui.service';

@Component({
  selector: 'app-user-actions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-actions.html',
  styleUrl: './user-actions.scss',
})
export class UserActions {
  auth = inject(AuthService);
  notificationsService = inject(NotificationsService);
  uiService = inject(UiService);
  private router = inject(Router);

  isProfileMenuOpen = signal(false);
  isNotificationsOpen = signal(false);

  toggleProfileMenu() {
    this.isProfileMenuOpen.update(v => !v);
  }

  closeProfileMenu() {
    this.isProfileMenuOpen.set(false);
  }

  toggleNotifications() {
    this.isNotificationsOpen.update(v => !v);
    this.isProfileMenuOpen.set(false);
  }

  closeNotifications() {
    this.isNotificationsOpen.set(false);
  }

  logout() {
    this.auth.logout();
    this.closeProfileMenu();
    this.router.navigate(['/']);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  getInitials(name: string): string {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 0) return '';
    return names[0].charAt(0).toUpperCase();
  }
}
