import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Subcategory {
  id: string;
  name: string;
  count: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  category: string;
  stock: number;
  isNew: boolean;
  discount: number;
}

@Component({
  selector: 'app-utiles-escolares',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './utiles-escolares.html',
  styleUrls: ['./utiles-escolares.scss'],
})
export class UtilesEscolares {

  /** ------------------------------
   *   FILTER SIGNALS
   * --------------------------------*/
  selectedCategory = signal<string>('all');
  priceRange = signal<string>('all');
  sortBy = signal<string>('featured');
  isSortOpen = signal<boolean>(false);

  /** ------------------------------
   *   SUBCATEGORIES
   * --------------------------------*/
  readonly subcategories: Subcategory[] = [
    { id: 'all', name: 'Todos los Productos', count: 245 },
    { id: 'cuadernos', name: 'Cuadernos', count: 45 },
    { id: 'lapices', name: 'Lápices y Bolígrafos', count: 67 },
    { id: 'mochilas', name: 'Mochilas', count: 23 },
    { id: 'colores', name: 'Colores y Marcadores', count: 38 },
    { id: 'geometria', name: 'Geometría', count: 28 },
    { id: 'adhesivos', name: 'Adhesivos', count: 19 },
    { id: 'carpetas', name: 'Carpetas y Archivadores', count: 25 }
  ];

  /** ------------------------------
   *   PRODUCT DATA
   * --------------------------------*/
  readonly products: Product[] = [
    {
      id: 1,
      name: 'Cuaderno Universitario Norma 100 Hojas',
      price: 2.50,
      originalPrice: 3.00,
      image: 'https://readdy.ai/api/search-image?query=Professional university notebook...',
      category: 'cuadernos',
      stock: 150,
      isNew: false,
      discount: 17
    },
    {
      id: 2,
      name: 'Set de Lápices Faber-Castell x12',
      price: 4.75,
      originalPrice: null,
      image: 'https://readdy.ai/api/search-image?query=Premium Faber-Castell...',
      category: 'lapices',
      stock: 89,
      isNew: true,
      discount: 0
    },
    {
      id: 3,
      name: 'Mochila Escolar Totto Reforzada',
      price: 45.00,
      originalPrice: 55.00,
      image: 'https://readdy.ai/api/search-image?query=Modern reinforced school backpack...',
      category: 'mochilas',
      stock: 12,
      isNew: false,
      discount: 18
    },
    {
      id: 4,
      name: 'Colores Prismacolor x24',
      price: 18.50,
      originalPrice: null,
      image: 'https://readdy.ai/api/search-image?query=Prismacolor colored pencils...',
      category: 'colores',
      stock: 45,
      isNew: true,
      discount: 0
    },
    {
      id: 5,
      name: 'Juego de Geometría Maped',
      price: 3.25,
      originalPrice: 4.00,
      image: 'https://readdy.ai/api/search-image?query=Maped geometry set...',
      category: 'geometria',
      stock: 78,
      isNew: false,
      discount: 19
    },
    {
      id: 6,
      name: 'Pegamento en Barra UHU 40g',
      price: 1.50,
      originalPrice: null,
      image: 'https://readdy.ai/api/search-image?query=UHU glue stick...',
      category: 'adhesivos',
      stock: 0,
      isNew: false,
      discount: 0
    },
    {
      id: 7,
      name: 'Carpeta Archivadora A4 con Anillos',
      price: 5.50,
      originalPrice: 6.50,
      image: 'https://readdy.ai/api/search-image?query=Professional A4 ring binder...',
      category: 'carpetas',
      stock: 34,
      isNew: false,
      discount: 15
    }
  ];

  /** ------------------------------
   *   FILTER + SORT + COMPUTED SIGNALS
   * --------------------------------*/

  filteredProducts = computed(() => {
    return this.products.filter(p => {
      if (this.selectedCategory() !== 'all' && p.category !== this.selectedCategory()) return false;

      switch (this.priceRange()) {
        case 'under5': return p.price < 5;
        case '5to15': return p.price >= 5 && p.price <= 15;
        case 'over15': return p.price > 15;
      }

      return true;
    });
  });

  sortedProducts = computed(() => {
    return [...this.filteredProducts()].sort((a, b) => {
      switch (this.sortBy()) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  });

  /** ------------------------------
   *   ACTIONS FROM TEMPLATE
   * --------------------------------*/
  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }

  setPriceRange(range: string) {
    this.priceRange.set(range);
  }

  setSort(type: string) {
    this.sortBy.set(type);
    this.isSortOpen.set(false);
  }
}
