import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { tap } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.checkAuth().pipe(
        tap(isAuthenticated => {
            if (!isAuthenticated) {
                router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
            }
        })
    );
};

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.checkAdmin().pipe(
        tap(isAdmin => {
            if (!isAdmin) {
                // Check if authenticated but not admin (e.g. client trying to access admin)
                // We need to check actual authentication status separately or infer it
                // Ideally checkAdmin handles the redirect or we do it here. 
                // Simplification for now: redirect to login if false. 
                // But wait, if I am a client logged in, isAdmin is false, I should go to home?
                // checkAdmin returns false if not logged in OR not admin.

                // Let's refine logic: if not admin, verify if authenticated to decide where to go.
                // But simplified: just redirect. 
                // If we want "403" behavior vs "401":
                if (authService.isAuthenticated()) {
                    router.navigate(['/']);
                } else {
                    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
                }
            }
        })
    );
};

export const warehouseGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.checkWarehouse().pipe(
        tap(isWarehouse => {
            if (!isWarehouse) {
                if (authService.isAuthenticated()) {
                    router.navigate(['/']);
                } else {
                    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
                }
            }
        })
    );
};
