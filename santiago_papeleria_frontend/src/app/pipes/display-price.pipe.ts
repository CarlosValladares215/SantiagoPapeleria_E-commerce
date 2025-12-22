import { Pipe, PipeTransform, inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { Product } from '../models/product.model';

@Pipe({
    name: 'displayPrice',
    standalone: true,
    pure: false // Impure because auth state might change dynamically (though signals might handle it, impure is safer for now)
})
export class DisplayPricePipe implements PipeTransform {
    private authService = inject(AuthService);

    transform(product: Product | any): number {
        if (!product) return 0;

        // Check if user is mayorista
        const isMayorista = this.authService.isMayorista();

        // Return wholesale price if available and user is mayorista
        if (isMayorista && product.wholesalePrice) {
            return product.wholesalePrice;
        }

        // Fallback to standard price
        return product.price || 0;
    }
}
