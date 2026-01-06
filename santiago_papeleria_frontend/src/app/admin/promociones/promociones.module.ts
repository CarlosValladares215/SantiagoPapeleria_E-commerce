
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PromocionesRoutes } from './promociones.routes';
import { PromocionListComponent } from './promocion-list/promocion-list.component';
import { PromocionFormComponent } from './promocion-form/promocion-form.component';

@NgModule({
    declarations: [
        PromocionListComponent,
        PromocionFormComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forChild(PromocionesRoutes)
    ]
})
export class PromocionesModule { }
