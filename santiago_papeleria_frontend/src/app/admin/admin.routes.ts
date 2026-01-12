import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', loadComponent: () => import('./erp-sync/erp-dashboard/erp-dashboard.component').then(m => m.ErpDashboardComponent) },

    // ERP Sync Routes
    { path: 'erp-sync', redirectTo: 'erp-sync/dashboard', pathMatch: 'full' },
    { path: 'erp-sync/dashboard', loadComponent: () => import('./erp-sync/erp-dashboard/erp-dashboard.component').then(m => m.ErpDashboardComponent) },
    { path: 'erp-sync/manual', loadComponent: () => import('./erp-sync/manual-sync/manual-sync.component').then(m => m.ManualSyncComponent) },
    { path: 'erp-sync/logs', loadComponent: () => import('./erp-sync/sync-logs/sync-logs.component').then(m => m.SyncLogsComponent) },
    { path: 'erp-sync/config', loadComponent: () => import('./erp-sync/erp-config/erp-config.component').then(m => m.ErpConfigComponent) },

    // Products Management
    { path: 'products/enrich/:sku', loadComponent: () => import('./products/product-enrich/product-enrich.component').then(m => m.ProductEnrichComponent) },
    { path: 'products', loadComponent: () => import('./products/products-list/admin-products-list.component').then(m => m.AdminProductsListComponent), pathMatch: 'full' },


    // Shipping Config
    { path: 'shipping', loadComponent: () => import('./shipping/shipping-config/shipping-config.component').then(m => m.ShippingConfigComponent) },

    // Promociones
    { path: 'promociones', loadChildren: () => import('./promociones/promociones.module').then(m => m.PromocionesModule) },


    // Payments Config
    { path: 'payments', loadComponent: () => import('./payments/payment-config/payment-config.component').then(m => m.PaymentConfigComponent) },


    // Reports
    { path: 'reports', loadComponent: () => import('./pages/reports/sales-dashboard/sales-dashboard.component').then(m => m.SalesDashboardComponent) },

    // Settings
    { path: 'settings', loadComponent: () => import('../pages/profile/profile').then(m => m.Profile) },
];