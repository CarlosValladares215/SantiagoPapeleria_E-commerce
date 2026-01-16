import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-profile-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './profile-sidebar.html',
  styleUrl: './profile-sidebar.scss'
})
export class ProfileSidebarComponent {
  authService = inject(AuthService);
}
