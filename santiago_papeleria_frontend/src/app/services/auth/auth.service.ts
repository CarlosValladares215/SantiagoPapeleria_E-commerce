import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
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


  private CLIENT_TOKEN_KEY = 'token';
  private ADMIN_TOKEN_KEY = 'admin_token';

  constructor(private router: Router, private http: HttpClient) {
    this.hydrateUser();
  }

  // Helper to get token based on context (URL)
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    if (path.startsWith('/admin') || path.startsWith('/warehouse')) {
      // Admin session lives in sessionStorage (dies on close)
      if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem(this.ADMIN_TOKEN_KEY);
      }
    }
    // Client session lives in localStorage (persists)
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.CLIENT_TOKEN_KEY);
    }
    return null;
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
  login(credentials: { email: string, password: string }): Observable<{ user: Usuario, token: string }> {
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      switchMap(response => {
        // Fetch User first to determine Role, passing token explicitly
        return this.getProfile(response.access_token).pipe(
          tap(user => {
            if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
              if (user.role === 'admin' || user.role === 'warehouse') {
                // We do NOT save admin token here. We pass it to the new tab via URL.
                // sessionStorage.setItem(this.ADMIN_TOKEN_KEY, response.access_token);
              } else {
                localStorage.setItem(this.CLIENT_TOKEN_KEY, response.access_token);
              }
            }
          }),
          // Map to return both user and token
          switchMap(user => new Observable<{ user: Usuario, token: string }>(obs => {
            obs.next({ user, token: response.access_token });
            obs.complete();
          }))
        );
      }),
      tap(({ user, token }) => {
        // Only update global state if we are in the correct context
        if (user.role !== 'admin' && user.role !== 'warehouse') {
          this.setUserState(user);
        } else {
          // For admin/warehouse, check if we are ALREADY in admin context (e.g. re-login inside admin)
          const path = typeof window !== 'undefined' ? window.location.pathname : '';
          if (path.startsWith('/admin') || path.startsWith('/warehouse')) {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(this.ADMIN_TOKEN_KEY, token);
            }
            this.setUserState(user);
          } else {
            // If we are on the client side login page and logged in as admin:
            // 1. CLEAR any client session remnants to prevent "logged in as admin on client"
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(this.CLIENT_TOKEN_KEY);
              localStorage.removeItem('user');
            }
            // 2. Ensure the local state signal is empty
            this.user.set(null);
          }
        }
      })
    );
  }

  // Fetch full profile from /me using token
  getProfile(explicitToken?: string): Observable<Usuario> {
    const token = explicitToken || this.getToken() || '';
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.get<Usuario>(`${this.apiUrl}/me`, { headers });
  }

  // Helper to update state
  private setUserState(user: Usuario) {
    this.user.set(user);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
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
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/admin') || path.startsWith('/warehouse')) {
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(this.ADMIN_TOKEN_KEY);
      } else {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(this.CLIENT_TOKEN_KEY);
      }
      if (typeof localStorage !== 'undefined') localStorage.removeItem('user');
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
    if (typeof window !== 'undefined') {

      // Check for token in URL (handoff logic)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      if (tokenFromUrl) {
        const path = window.location.pathname;
        if (path.startsWith('/admin') || path.startsWith('/warehouse')) {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(this.ADMIN_TOKEN_KEY, tokenFromUrl);
            // Remove token from URL and clean history
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          }
        }
      }

      // We don't subscribe here anymore to avoid race conditions with Guards.
      // The Guards will call checkAuth() -> getProfile() which will hydrate the user.
      // However, for the main client app which might not have guards on home page, we still might want to load user.
      // But we can lazy load it or let the first protected route handle it.
      // Actually, for header user info, we SHOULD try to load.
      const token = this.getToken();
      if (token && !this.user()) {
        this.getProfile().pipe(
          tap(user => this.setUserState(user)),
          catchError(() => {
            this.logout();
            return of(null); // Return an observable that completes with null
          })
        ).subscribe();
      }
    }
  }

  // --- Methods for Guards (Async Checks) ---

  checkAuth(): Observable<boolean> {
    // If we already have a user, we are authenticated
    if (this.user()) return of(true);

    const token = this.getToken();
    if (!token) return of(false);

    // If we have a token but no user, verify it
    return this.getProfile().pipe(
      tap(user => this.setUserState(user)),
      switchMap(() => of(true)),
      catchError(() => {
        this.logout(); // Token expired/invalid, log out
        return of(false);
      })
    );
  }

  checkAdmin(): Observable<boolean> {
    return this.checkAuth().pipe(
      switchMap(isAuthenticated => {
        if (!isAuthenticated) return of(false);
        return of(this.isAdmin());
      }),
      // Catch errors from checkAuth (e.g. 401) - already handled by checkAuth's catchError
      // tap({ error: () => this.logout() }) // Redundant if checkAuth handles it
    );
  }

  checkWarehouse(): Observable<boolean> {
    return this.checkAuth().pipe(
      switchMap(isAuthenticated => {
        if (!isAuthenticated) return of(false);
        return of(this.isWarehouse());
      }),
      // tap({ error: () => this.logout() }) // Redundant if checkAuth handles it
    );
  }
}
