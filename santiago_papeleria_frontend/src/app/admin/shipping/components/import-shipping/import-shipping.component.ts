import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, CloudUpload, FileSpreadsheet } from 'lucide-angular';
import { ShippingStateService } from '../../services/shipping-state.service';
import { ShippingService } from '../../../../services/shipping.service';

@Component({
    selector: 'app-import-shipping',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    providers: [
        { provide: LucideAngularModule, useValue: LucideAngularModule.pick({ CloudUpload, FileSpreadsheet }) }
    ],
    templateUrl: './import-shipping.component.html',
})
export class ImportShippingComponent {
    state = inject(ShippingStateService);
    private shippingService = inject(ShippingService);

    message = signal('');

    onFileSelected(e: any) {
        const file = e.target.files[0];
        if (!file) return;

        this.message.set('Importando...');
        this.shippingService.importExcel(file).subscribe({
            next: (res: any) => {
                this.message.set(`Éxito: Importadas ${res.importedRates} tarifas`);
                this.state.loadAll(); // Reload everything
            },
            error: () => this.message.set('Error en importación')
        });
    }
}
