import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Settings, Map, Upload } from 'lucide-angular';
import { ShippingStateService } from '../services/shipping-state.service';
import { GeneralConfigComponent } from '../components/general-config/general-config.component';
import { ZonesComponent } from '../components/zones/zones.component';
import { ImportShippingComponent } from '../components/import-shipping/import-shipping.component';

@Component({
    selector: 'app-shipping-config',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        GeneralConfigComponent,
        ZonesComponent,
        ImportShippingComponent
    ],
    providers: [
        { provide: LucideAngularModule, useValue: LucideAngularModule.pick({ Settings, Map, Upload }) }
    ],
    templateUrl: './shipping-config.component.html',
    styleUrl: './shipping-config.component.scss'
})
export class ShippingConfigComponent {
    state = inject(ShippingStateService);
    currentTab = signal<'general' | 'zones' | 'import'>('general');

    switchTab(tab: 'general' | 'zones' | 'import') {
        this.currentTab.set(tab);
    }
}
