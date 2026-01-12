import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Check if the request already has an Authorization header (e.g., manually set in AuthService)
    if (req.headers.has('Authorization')) {
        return next(req);
    }

    const url = window.location.pathname;
    let token: string | null = null;
    if (url.startsWith('/admin') || url.startsWith('/warehouse')) {
        token = sessionStorage.getItem('admin_token');
    } else {
        token = localStorage.getItem('token');
    }

    if (token) {
        const authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        return next(authReq);
    }

    return next(req);
};
