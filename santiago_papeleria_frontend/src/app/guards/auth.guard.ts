import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
        return true;
    }

    // Redirect to login preserving the return url
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated() && authService.isAdmin()) {
        return true;
    }

    // If authenticated but not admin, redirect home or show forbidden
    if (authService.isAuthenticated()) {
        router.navigate(['/']);
        return false;
    }

    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
};

export const warehouseGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated() && authService.isWarehouse()) {
        return true;
    }

    if (authService.isAuthenticated()) {
        router.navigate(['/']);
        return false;
    }

    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
};
