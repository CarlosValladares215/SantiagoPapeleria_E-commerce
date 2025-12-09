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
  { path: '', component: Home },

  { path: 'product/:id', component: Product },
  { path: 'products', loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent), pathMatch: 'full' },

  {
    path: 'categories',
    children: categoriesRoutes
  },

  { path: 'contact', component: Contact },
  { path: 'checkout', component: Checkout },
  { path: 'tracking', component: Tracking },
  { path: 'offers', component: Offers },
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  { path: '**', component: NotFound },
];
