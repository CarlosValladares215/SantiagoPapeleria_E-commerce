import { Routes } from '@angular/router';
import { Categories } from './categories';

export const categoriesRoutes: Routes = [
  {
    path: '',
    component: Categories,
    children: [
      {
        path: 'utiles-escolares',
        loadComponent: () =>
          import('./utiles-escolares/utiles-escolares')
            .then(m => m.UtilesEscolares),
      },
      {
        path: 'arte-manualidades',
        loadComponent: () =>
          import('./arte-manualidades/arte-manualidades')
            .then(m => m.ArteManualidades),
      },
      {
        path: 'suministros-oficina',
        loadComponent: () =>
          import('./suministros-oficina/suministros-oficina')
            .then(m => m.SuministrosOficina),
      },
      {
        path: 'tecnologia',
        loadComponent: () =>
          import('./tecnologia/tecnologia')
            .then(m => m.Tecnologia),
      },
      {
        path: 'mobiliario',
        loadComponent: () =>
          import('./mobiliario/mobiliario')
            .then(m => m.Mobiliario),
      }
    ],
  },
];
