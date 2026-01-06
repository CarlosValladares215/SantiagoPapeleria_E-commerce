
import { Routes } from '@angular/router';
import { PromocionListComponent } from './promocion-list/promocion-list.component';
import { PromocionFormComponent } from './promocion-form/promocion-form.component';

export const PromocionesRoutes: Routes = [
    {
        path: '',
        component: PromocionListComponent
    },
    {
        path: 'crear',
        component: PromocionFormComponent
    },
    {
        path: 'editar/:id',
        component: PromocionFormComponent
    }
];
