import { Routes } from '@angular/router';

// Layouts
import { Public } from './layouts/public/public';
import { Admin } from './layouts/admin/admin';

// Páginas publicas
import { Home } from './pages/home/home';
import { Product } from './pages/product/product';
import { Categories } from './pages/categories/categories';
import { Contact } from './pages/contact/contact';

import { Tracking } from './pages/tracking/tracking';
import { Offers } from './pages/offers/offers';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { NotFound } from './pages/not-found/not-found';
import { ADMIN_ROUTES } from './admin/admin.routes';
import { VerifyEmailComponent } from './pages/auth/verify-email/verify-email.component';
import { adminGuard, warehouseGuard } from './guards/auth.guard';

export const routes: Routes = [

  // Admin Routes (Specific path, checks first)
  {
    path: 'admin',
    component: Admin,
    canActivate: [adminGuard],
    children: ADMIN_ROUTES
  },

  // Warehouse Routes
  {
    path: 'warehouse',
    loadChildren: () => import('./pages/warehouse/warehouse.routes').then(m => m.WAREHOUSE_ROUTES),
    canActivate: [warehouseGuard]
  },

  // Invoice (No Layout for printing)
  {
    path: 'orders/invoice/:id',
    loadComponent: () => import('./pages/orders/invoice/invoice').then(m => m.Invoice)
  },

  // Guide (No Layout for printing)
  {
    path: 'orders/guide/:id',
    loadComponent: () => import('./pages/orders/guide/guide').then(m => m.GuideComponent)
  },

  // Public Routes (Wrapped in MainLayout)
  {
    path: '',
    component: Public,
    children: [
      { path: '', component: Home },
      { path: 'product/:slug', component: Product },
      { path: 'products', loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent), pathMatch: 'full' },
      { path: 'contact', component: Contact },
      { path: 'cart', loadComponent: () => import('./pages/cart/cart').then(m => m.Cart) },
      { path: 'tracking', component: Tracking },
      { path: 'offers', component: Offers },
      { path: 'login', component: Login },
      { path: 'register', component: Register },
      { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword) },
      { path: 'verify-email', component: VerifyEmailComponent },
      { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPasswordComponent) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },
      { path: 'orders', loadComponent: () => import('./pages/orders/orders').then(m => m.Orders) },
      { path: 'favorites', loadComponent: () => import('./pages/favorites/favorites').then(m => m.Favorites) },

      // Wildcard inside layout ensures 404 page gets header/footer
      { path: '**', component: NotFound },
    ]
  }
];
