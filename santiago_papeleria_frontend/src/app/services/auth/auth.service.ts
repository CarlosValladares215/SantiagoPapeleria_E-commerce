import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { Usuario } from '../../models/usuario.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.baseApiUrl}/usuarios`;
  private verifyApiUrl = `${environment.baseApiUrl}/usuarios`;

  user = signal<Usuario | null>(null);

  isAuthenticated = computed(() => this.user() !== null);
  isAdmin = computed(() => this.user()?.role === 'admin');
  isWarehouse = computed(() => this.user()?.role === 'warehouse');

  // Customer Types
  isMinorista = computed(() => this.user()?.tipo_cliente === 'MINORISTA');
  isMayorista = computed(() => this.user()?.tipo_cliente === 'MAYORISTA');
  customerType = computed(() => this.user()?.tipo_cliente || 'MINORISTA');


  constructor(private router: Router, private http: HttpClient) {
    this.hydrateUser();
  }

  register(userData: Usuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, userData);
  }

  registerNew(userData: {
    name: string;
    email: string;
    password: string;
    client_type: 'MINORISTA' | 'MAYORISTA';
    cedula?: string;
    telefono?: string;
    datos_negocio?: any; // Allow passing business data
  }): Observable<{ message: string; userId: string; access_token?: string; user?: any }> {
    return this.http.post<{ message: string; userId: string; access_token?: string; user?: any }>(
      `${this.verifyApiUrl}/register`,
      userData
    );
  }

  verifyEmail(token: string): Observable<{ verified: boolean; message: string; access_token?: string; user?: any }> {
    return this.http.get<{ verified: boolean; message: string; access_token?: string; user?: any }>(
      `${this.verifyApiUrl}/verify-email?token=${token}`
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { token, newPassword });
  }

  resendVerificationEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.verifyApiUrl}/resend-verification`,
      { email }
    );
  }

  // Login contra el backend calling /login then /me
  login(credentials: { email: string, password: string }): Observable<Usuario> {
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      switchMap(response => {
        // Save Token
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem('token', response.access_token);
        }
        // Fetch Profile
        return this.getProfile();
      }),
      tap(user => {
        this.setUserState(user);
      })
    );
  }

  // Fetch full profile from /me using token
  getProfile(): Observable<Usuario> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.get<Usuario>(`${this.apiUrl}/me`, { headers });
  }

  // Helper to update state
  private setUserState(user: Usuario) {
    this.user.set(user);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      // We might not need to store full user in localstorage anymore if we hydrate on load
      // But for offline/performance it's okay to keep it, but source of truth is /me
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  // Deprecated/Low-level API call if needed directly (returns only token)
  loginApi(credentials: { email: string, password: string }): Observable<{ access_token: string }> {
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/login`, credentials);
  }

  // Guardar sesión en el estado (Signal + LocalStorage) -> Deprecated, use setUserState
  setSession(userData: Usuario) {
    this.setUserState(userData);
  }

  logout() {
    this.user.set(null);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
    this.router.navigate(['/']);
  }

  updateProfile(userId: string, data: Partial<Usuario>): Observable<Usuario> {
    return new Observable(observer => {
      this.http.put<Usuario>(`${this.apiUrl}/${userId}`, data).subscribe({
        next: (updatedUser) => {
          const currentUser = this.user();
          const newUserData = { ...currentUser, ...updatedUser };
          this.setUserState(newUserData);

          observer.next(newUserData);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  // Helper to hydrate state on app load
  hydrateUser() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        this.getProfile().subscribe({
          next: (user) => this.user.set(user),
          error: () => this.logout() // Token expired/invalid
        });
      }
    }
  }
}
