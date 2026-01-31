import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {

  formData = {
    email: '',
    password: '',
  };

  showPassword = false;
  isLoading = false;
  rememberMe = true;

  emailError: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  validateEmail(): boolean {
    if (!this.formData.email.includes('@')) {
      this.emailError = 'El correo debe contener un @';
      return false;
    }
    this.emailError = null;
    return true;
  }

  handleSubmit() {
    if (!this.validateEmail()) {
      return;
    }

    this.isLoading = true;

    this.authService.login(this.formData, this.rememberMe).subscribe({
      next: ({ user, token }) => {
        this.isLoading = false;
        console.log('Login exitoso:', user);
        // Session set automatically by service

        if (user.role === 'admin') {
          // Open Admin Panel in new tab with token handoff because session lives in sessionStorage
          window.open(`/admin/dashboard?token=${token}`, '_blank');
          // Redirect current page to home (not logged in as client)
          this.router.navigate(['/']);
        } else if (user.role === 'warehouse') {
          // Open Warehouse Panel in new tab
          window.open(`/warehouse/dashboard?token=${token}`, '_blank');
          this.router.navigate(['/']);
        } else {
          // Client login - proceed as normal
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error login', err);
        alert('Credenciales incorrectas o error en el servidor');
      }
    });
  }
}
