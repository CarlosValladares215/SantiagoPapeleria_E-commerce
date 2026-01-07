import { Pipe, PipeTransform, inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { Product } from '../models/product.model';

@Pipe({
    name: 'displayPrice',
    standalone: true,
    pure: true
})
export class DisplayPricePipe implements PipeTransform {
    private authService = inject(AuthService);

    transform(product: Product | any): number {
        if (product === null || product === undefined) return 0;

        // If it's already a number (like a promotional price passed directly), return it
        if (typeof product === 'number') return product;

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
