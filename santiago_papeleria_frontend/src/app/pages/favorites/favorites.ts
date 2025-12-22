import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { DisplayPricePipe } from '../../pipes/display-price.pipe';

interface FavoriteProduct {
    id: string;
    name: string;
    category: string;
    price: number;
    wholesalePrice?: number;
    image: string;
    inStock: boolean;
    filterCategory: string; // To match the tabs
}

@Component({
    selector: 'app-favorites',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive, DisplayPricePipe],
    templateUrl: './favorites.html',
    styleUrl: './favorites.scss'
})
export class Favorites {
    authService = inject(AuthService);
    activeFilter: string = 'Todos';

    // Mock Categories from Screenshot
    // Todos (8), Útiles Escolares (2), Arte y Manualidades (3), Tecnología (1), Suministros de Oficina (2)
    filters = [
        { label: 'Todos', count: 8, value: 'Todos' },
        { label: 'Útiles Escolares', count: 2, value: 'Útiles Escolares' },
        { label: 'Arte y Manualidades', count: 3, value: 'Arte y Manualidades' },
        { label: 'Tecnología', count: 1, value: 'Tecnología' },
        { label: 'Suministros de Oficina', count: 2, value: 'Suministros de Oficina' }
    ];

    products: FavoriteProduct[] = [
        {
            id: '1',
            name: 'JUEGO DE GEOMETRÍA 5 PIEZAS',
            category: 'GEOMETRÍA Y DIBUJO',
            price: 3.99,
            wholesalePrice: 2.99,
            image: 'assets/products/geometry.png', // Placeholder
            inStock: true,
            filterCategory: 'Útiles Escolares'
        },
        {
            id: '2',
            name: 'CUADERNO UNIVERSITARIO',
            category: 'GEOMETRÍA Y DIBUJO',
            price: 2.50,
            wholesalePrice: 1.80,
            image: 'assets/products/notebook.png',
            inStock: true,
            filterCategory: 'Útiles Escolares'
        },
        {
            id: '3',
            name: 'SET DE PINCELES PROFESIONALES',
            category: 'ARTE Y PINTURA',
            price: 12.99,
            wholesalePrice: 10.00,
            image: 'assets/products/brushes.png',
            inStock: true,
            filterCategory: 'Arte y Manualidades'
        },
        {
            id: '4',
            name: 'ACUARELAS 12 COLORES',
            category: 'ARTE Y PINTURA',
            price: 8.50,
            wholesalePrice: 6.50,
            image: 'assets/products/watercolors.png',
            inStock: true,
            filterCategory: 'Arte y Manualidades'
        },
        {
            id: '5',
            name: 'LIENZO 30x40cm',
            category: 'ARTE Y PINTURA',
            price: 5.75,
            wholesalePrice: 4.25,
            image: 'assets/products/canvas.png',
            inStock: false, // Testing out of stock?
            filterCategory: 'Arte y Manualidades'
        },
        {
            id: '6',
            name: 'CALCULADORA CIENTÍFICA',
            category: 'TECNOLOGÍA',
            price: 25.00,
            wholesalePrice: 21.50,
            image: 'assets/products/calculator.png',
            inStock: true,
            filterCategory: 'Tecnología'
        },
        {
            id: '7',
            name: 'RESMA PAPEL BOND A4',
            category: 'OFICINA',
            price: 4.50,
            wholesalePrice: 3.75,
            image: 'assets/products/paper.png',
            inStock: true,
            filterCategory: 'Suministros de Oficina'
        },
        {
            id: '8',
            name: 'ARCHIVADOR PALANCA',
            category: 'OFICINA',
            price: 3.25,
            wholesalePrice: 2.50,
            image: 'assets/products/folder.png',
            inStock: true,
            filterCategory: 'Suministros de Oficina'
        }
    ];

    get filteredProducts() {
        if (this.activeFilter === 'Todos') return this.products;
        return this.products.filter(p => p.filterCategory === this.activeFilter);
    }

    setFilter(filter: string) {
        this.activeFilter = filter;
    }

    // Placeholder for remove favorite logic
    toggleFavorite(id: string) {
        console.log('Remove favorite', id);
        // In real app, call service to remove
    }

    addToCart(id: string) {
        console.log('Add to cart', id);
    }
}
