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

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  handleSubmit() {
    this.isLoading = true;

    this.authService.loginApi(this.formData).subscribe({
      next: (user) => {
        this.isLoading = false;
        console.log('Login exitoso:', user);
        this.authService.setSession(user);

        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin/dashboard']);
        } else if (this.authService.isWarehouse()) {
          this.router.navigate(['/warehouse/dashboard']);
        } else {
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
