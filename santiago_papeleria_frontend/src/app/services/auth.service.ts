import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
  id: string;
  name: string;
  email: string;
  accountType: 'minorista' | 'mayorista';
  avatar?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user = signal<User | null>(null);

  isAuthenticated = computed(() => this.user() !== null);

  constructor(private router: Router) {
    // Evitar error en SSR
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('user');
      if (saved) {
        this.user.set(JSON.parse(saved));
      }
    }
  }

  login(userData: User) {
    this.user.set(userData);

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  }

  logout() {
    this.user.set(null);

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('user');
    }

    this.router.navigate(['/']);
  }
}
