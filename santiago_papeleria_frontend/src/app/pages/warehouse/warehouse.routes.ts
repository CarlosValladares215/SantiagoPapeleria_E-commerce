import { Routes } from '@angular/router';
import { WarehouseDashboardComponent } from './dashboard/dashboard.component';

export const WAREHOUSE_ROUTES: Routes = [
    {
        path: '',
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: WarehouseDashboardComponent }
        ]
    }
];
