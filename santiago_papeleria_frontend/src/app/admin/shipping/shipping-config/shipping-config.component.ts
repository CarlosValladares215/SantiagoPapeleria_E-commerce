import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ShippingStateService } from '../services/shipping-state.service';
import { GeneralConfigComponent } from '../components/general-config/general-config.component';
import { ZonesComponent } from '../components/zones/zones.component';
import { ImportShippingComponent } from '../components/import-shipping/import-shipping.component';
import { CityConfigComponent } from '../components/city-config/city-config.component';

@Component({
    selector: 'app-shipping-config',
    standalone: true,
    imports: [
        CommonModule,
        LucideAngularModule,
        GeneralConfigComponent,
        ZonesComponent,
        ImportShippingComponent,
        CityConfigComponent
    ],
    templateUrl: './shipping-config.component.html',
    styleUrl: './shipping-config.component.scss'
})
export class ShippingConfigComponent implements OnInit {
    state = inject(ShippingStateService);
    currentTab = signal<'general' | 'zones' | 'cities' | 'import'>('general');

    ngOnInit() {
        this.state.loadAll();
    }

    switchTab(tab: 'general' | 'zones' | 'cities' | 'import') {
        this.currentTab.set(tab);
    }
}
