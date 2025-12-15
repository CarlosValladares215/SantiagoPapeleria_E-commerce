import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Product } from './pages/product/product';
import { Categories } from './pages/categories/categories';
import { Contact } from './pages/contact/contact';
import { Checkout } from './pages/checkout/checkout';
import { Tracking } from './pages/tracking/tracking';
import { Offers } from './pages/offers/offers';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { NotFound } from './pages/not-found/not-found';
import { categoriesRoutes } from './pages/categories/categories.routes';

export const routes: Routes = [
  // Admin Routes (Specific path, checks first)
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [() => import('./guards/auth.guard').then(m => m.adminGuard)],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/admin/erp-sync/erp-dashboard/erp-dashboard.component').then(m => m.ErpDashboardComponent) },

      // ERP Sync Routes
      { path: 'erp-sync', redirectTo: 'erp-sync/dashboard', pathMatch: 'full' },
      { path: 'erp-sync/dashboard', loadComponent: () => import('./pages/admin/erp-sync/erp-dashboard/erp-dashboard.component').then(m => m.ErpDashboardComponent) },
      { path: 'erp-sync/manual', loadComponent: () => import('./pages/admin/erp-sync/manual-sync/manual-sync.component').then(m => m.ManualSyncComponent) },
      { path: 'erp-sync/logs', loadComponent: () => import('./pages/admin/erp-sync/sync-logs/sync-logs.component').then(m => m.SyncLogsComponent) },
      { path: 'erp-sync/config', loadComponent: () => import('./pages/admin/erp-sync/erp-config/erp-config.component').then(m => m.ErpConfigComponent) },

      // Products Management
      { path: 'products/enrich/:sku', loadComponent: () => import('./pages/admin/products/product-enrich/product-enrich.component').then(m => m.ProductEnrichComponent) },
      { path: 'products/variants', loadComponent: () => import('./pages/admin/products/product-variants/product-variants.component').then(m => m.ProductVariantsComponent) },
      { path: 'products', loadComponent: () => import('./pages/admin/products/products-list/admin-products-list.component').then(m => m.AdminProductsListComponent), pathMatch: 'full' },
      { path: 'settings', loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },
    ]
  },

  // Public Routes (Wrapped in MainLayout)
  {
    path: '',
    loadComponent: () => import('./shared/layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', component: Home },
      { path: 'product/:id', component: Product },
      { path: 'products', loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent), pathMatch: 'full' },
      {
        path: 'categories',
        children: categoriesRoutes
      },
      { path: 'contact', component: Contact },
      { path: 'checkout', component: Checkout },
      { path: 'cart', loadComponent: () => import('./pages/cart/cart').then(m => m.Cart) },
      { path: 'tracking', component: Tracking },
      { path: 'offers', component: Offers },
      { path: 'login', component: Login },
      { path: 'register', component: Register },
      { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword) },
      { path: 'profile', loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },
      { path: 'orders', loadComponent: () => import('./pages/orders/orders').then(m => m.Orders) },
      { path: 'favorites', loadComponent: () => import('./pages/favorites/favorites').then(m => m.Favorites) },

      // Wildcard inside layout ensures 404 page gets header/footer
      { path: '**', component: NotFound },
    ]
  },
];
