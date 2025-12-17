import { Routes } from '@angular/router';

// Layouts
import { Public } from './layouts/public/public';
import { Admin } from './layouts/admin/admin';

// Páginas publicas
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
import { ADMIN_ROUTES } from './admin/admin.routes';

export const routes: Routes = [

  // Admin Routes (Specific path, checks first)
  {
    path: 'admin',
    component: Admin,
    children: ADMIN_ROUTES
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
  }
];
