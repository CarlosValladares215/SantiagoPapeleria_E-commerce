import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario } from '../../models/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/usuarios';

  user = signal<Usuario | null>(null);

  isAuthenticated = computed(() => this.user() !== null);
  isAdmin = computed(() => this.user()?.role === 'admin');
  isWarehouse = computed(() => this.user()?.role === 'warehouse');


  constructor(private router: Router, private http: HttpClient) {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('user');
      if (saved) {
        this.user.set(JSON.parse(saved));
      }
    }
  }

  register(userData: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, userData);
  }

  // Login contra el backend
  loginApi(credentials: { email: string, password: string }): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.apiUrl}/login`, credentials);
  }

  // Guardar sesión en el estado (Signal + LocalStorage)
  setSession(userData: Usuario) {
    // Asegurar que el token exista (aunque sea mock) para validaciones isAuth
    if (!userData.token) userData.token = 'mock-jwt-token-login';

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

  updateProfile(userId: string, data: Partial<Usuario>): Observable<Usuario> {
    return new Observable(observer => {
      this.http.put<Usuario>(`${this.apiUrl}/${userId}`, data).subscribe({
        next: (updatedUser) => {
          // Update local state and storage
          // Merge with existing session data to keep tokens etc if backend doesn't return them
          const currentUser = this.user();
          const newUserData = { ...currentUser, ...updatedUser };

          this.user.set(newUserData);
          if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(newUserData));
          }
          observer.next(newUserData);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }
}
