import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
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
    private auth: AuthService
  ) {}

  handleSubmit() {
    this.isLoading = true;

    setTimeout(() => {
      this.isLoading = false;

      const userData = {
        id: '1',
        name: 'Juan Pérez',
        email: this.formData.email,
        accountType: 'minorista' as const
      };

      this.auth.login(userData);
      this.router.navigate(['/']);
    }, 1500);
  }
}
