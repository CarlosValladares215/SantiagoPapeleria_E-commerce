import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Check if the request already has an Authorization header (e.g., manually set in AuthService)
    if (req.headers.has('Authorization')) {
        return next(req);
    }

    const isApiRequest = req.url.startsWith(environment.baseApiUrl);
    const headers: any = {};

    if (isApiRequest) {
        headers['X-Tunnel-Skip-Anti-Phishing-Page'] = 'true';
    }

    const url = window.location.pathname;
    let token: string | null = null;
    if (url.startsWith('/admin') || url.startsWith('/warehouse')) {
        token = sessionStorage.getItem('admin_token');
    } else {
        token = localStorage.getItem('token');
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const authReq = req.clone({
        setHeaders: headers
    });
    return next(authReq);
};
