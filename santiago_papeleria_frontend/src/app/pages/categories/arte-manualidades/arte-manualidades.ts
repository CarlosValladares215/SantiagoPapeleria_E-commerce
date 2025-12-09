import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface Subcategory {
  id: string;
  name: string;
  count: number;
}

interface PriceRange {
  id: string;
  label: string;
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
  selector: 'app-arte-manualidades',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './arte-manualidades.html',
  styleUrl: './arte-manualidades.scss',
})
export class ArteManualidades {
  /* -------------------------------- Signals ------------------------------- */
  selectedSubcategory = signal<string>('all');
  priceRange = signal<string>('all');
  sortBy = signal<string>('featured');
  isSortOpen = signal<boolean>(false);
  currentPage = signal<number>(1);
  readonly itemsPerPage = 12;

  /* -------------------------------- Data --------------------------------- */
  readonly subcategories: Subcategory[] = [
    { id: 'all', name: 'Todos los Productos', count: 178 },
    { id: 'pinturas', name: 'Pinturas y Pinceles', count: 38 },
    { id: 'papeles', name: 'Papeles Especiales', count: 32 },
    { id: 'manualidades', name: 'Materiales para Manualidades', count: 45 },
    { id: 'dibujo', name: 'Dibujo Técnico', count: 28 },
    { id: 'modelado', name: 'Modelado y Escultura', count: 22 },
    { id: 'scrapbook', name: 'Scrapbooking', count: 13 },
  ];

  readonly priceRanges: PriceRange[] = [
    { id: 'all', label: 'Todos los precios' },
    { id: 'under10', label: 'Menos de $10' },
    { id: '10to25', label: '$10 - $25' },
    { id: 'over25', label: 'Más de $25' },
  ];

  readonly products: Product[] = [
    {
      id: 1,
      name: 'Set de Acuarelas 24 Colores Profesional',
      price: 18.5,
      originalPrice: 24,
      image: 'assets/Filtro/arte-manualidades/img1.jpg',
      category: 'pinturas',
      stock: 89,
      isNew: false,
      discount: 23,
    },
    {
      id: 2,
      name: 'Pinceles Sintéticos Set de 12 Piezas',
      price: 14.0,
      originalPrice: null,
      image: 'assets/Filtro/arte-manualidades/img2.jpg',
      category: 'pinturas',
      stock: 134,
      isNew: true,
      discount: 0,
    },
    {
      id: 3,
      name: 'Papel Acuarela A4 300g x20 Hojas',
      price: 12.5,
      originalPrice: 15,
      image: 'assets/Filtro/arte-manualidades/img3.jpg',
      category: 'papeles',
      stock: 67,
      isNew: false,
      discount: 17,
    },
    {
      id: 4,
      name: 'Tijeras Decorativas Set de 6 Diseños',
      price: 9.75,
      originalPrice: null,
      image: 'assets/Filtro/arte-manualidades/img4.jpg',
      category: 'manualidades',
      stock: 0,
      isNew: true,
      discount: 0,
    },
    {
      id: 5,
      name: 'Marcadores Artísticos Doble Punta x48',
      price: 32,
      originalPrice: 42,
      image: 'assets/Filtro/arte-manualidades/img5.jpg',
      category: 'dibujo',
      stock: 45,
      isNew: false,
      discount: 24,
    },
    {
      id: 6,
      name: 'Arcilla Polimérica 24 Colores',
      price: 22.0,
      originalPrice: null,
      image: 'assets/Filtro/arte-manualidades/img6.jpg',
      category: 'modelado',
      stock: 78,
      isNew: true,
      discount: 0,
    },
    {
      id: 7,
      name: 'Cartulina de Colores A4 x100 Hojas',
      price: 8.5,
      originalPrice: 11.0,
      image: 'assets/Filtro/arte-manualidades/img7.jpg',
      category: 'papeles',
      stock: 198,
      isNew: false,
      discount: 23,
    },
  ];



  /* ------------------ Computed Signals ------------------ */
  filteredProducts = signal<Product[]>([]);
  sortedProducts = signal<Product[]>([]);
  paginatedProducts = signal<Product[]>([]);
  totalPages = signal<number>(1);

  constructor(private router: Router) {
    this.applyFilters();
  }

  /* ------------------------ Actions ------------------------ */
  setSubcategory(id: string) {
    this.selectedSubcategory.set(id);
    this.currentPage.set(1);
    this.applyFilters();
  }

  setPriceRange(id: string) {
    this.priceRange.set(id);
    this.currentPage.set(1);
    this.applyFilters();
  }

  setSort(option: string) {
    this.sortBy.set(option);
    this.isSortOpen.set(false);
    this.applyFilters();
  }

  resetFilters() {
    this.selectedSubcategory.set('all');
    this.priceRange.set('all');
    this.currentPage.set(1);
    this.applyFilters();
  }

  /* ------------------------ Core Logic ------------------------ */
  private applyFilters() {
    let filtered = this.products.filter((p) => {
      if (this.selectedSubcategory() !== 'all' && p.category !== this.selectedSubcategory())
        return false;

      switch (this.priceRange()) {
        case 'under10':
          return p.price < 10;
        case '10to25':
          return p.price >= 10 && p.price <= 25;
        case 'over25':
          return p.price > 25;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (this.sortBy()) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    const total = Math.ceil(sorted.length / this.itemsPerPage);
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const page = sorted.slice(start, start + this.itemsPerPage);

    this.filteredProducts.set(filtered);
    this.sortedProducts.set(sorted);
    this.totalPages.set(total);
    this.paginatedProducts.set(page);
  }

  /* ------------------------ Helpers ------------------------ */
  categoryLabel(cat: string): string {
    switch (cat) {
      case 'pinturas': return 'Pinturas y Pinceles';
      case 'papeles': return 'Papeles Especiales';
      case 'manualidades': return 'Materiales para Manualidades';
      case 'dibujo': return 'Dibujo Técnico';
      case 'modelado': return 'Modelado y Escultura';
      case 'scrapbook': return 'Scrapbooking';
      default: return 'Arte y Manualidades';
    }
  }

  navigateToProduct(id: number) {
    this.router.navigate(['/product'], { queryParams: { id } });
  }
}
