import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ShippingStateService } from '../../services/shipping-state.service';
import { ShippingConfig } from '../../../../services/shipping.service';

@Component({
    selector: 'app-general-config',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    templateUrl: './general-config.component.html',
})
export class GeneralConfigComponent {
    state = inject(ShippingStateService);

    // Local computed for IVA to handle % conversion
    ivaPercentage = computed(() => {
        const rate = this.state.config().ivaRate;
        return Math.round(rate * 100);
    });

    updateIva(val: any) {
        const num = Number(val);
        if (!isNaN(num) && num >= 0) {
            this.updateField('ivaRate', num / 100);
        }
    }

    updateField(field: keyof ShippingConfig, value: any) {
        const current = this.state.config();
        this.state.updateConfig({ ...current, [field]: value });
    }

    preventSymbols(event: KeyboardEvent) {
        if (['+', '-', 'e', 'E'].includes(event.key)) {
            event.preventDefault();
        }
    }

    save() {
        // Basic validation
        const p = this.state.config();
        if (p.baseRate < 0 || p.ivaRate < 0 || p.ratePerKg < 0) {
            alert('No se permiten valores negativos'); // Simple alert for now, or emit an event to parent to show toast
            return;
        }

        this.state.saveConfigWrapper()?.subscribe({
            next: () => {
                // Could emit event or show toast via service if service had toast logic
                // For now we can rely on global toast or just console
                console.log('Saved');
            },
            error: () => console.error('Error saving')
        });
    }
}
