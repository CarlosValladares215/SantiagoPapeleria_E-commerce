import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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
  rating: number;
  reviews: number;
  stock: number;
  isNew: boolean;
  discount: number;
}

@Component({
  selector: 'app-mobiliario',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mobiliario.html',
  styleUrl: './mobiliario.scss',
})
export class Mobiliario {
  // Filtros
  selectedSubcategory = signal<string>('all');
  priceRange = signal<string>('all');
  sortBy = signal<string>('featured');
  isSortOpen = signal<boolean>(false);
  currentPage = signal<number>(1);
  readonly itemsPerPage = 12;

  // Datos estáticos
  readonly subcategories: Subcategory[] = [
    { id: 'all', name: 'Todos los Productos', count: 15 },
    { id: 'escritorios', name: 'Escritorios', count: 4 },
    { id: 'sillas', name: 'Sillas Ergonómicas', count: 3 },
    { id: 'estanterias', name: 'Estanterías', count: 3 },
    { id: 'organizadores', name: 'Organizadores', count: 3 },
    { id: 'accesorios', name: 'Accesorios de Escritorio', count: 2 },
  ];

  readonly priceRanges: PriceRange[] = [
    { id: 'all', label: 'Todos los precios' },
    { id: '0-100', label: '$0 - $100' },
    { id: '100-300', label: '$100 - $300' },
    { id: '300-500', label: '$300 - $500' },
    { id: '500+', label: '$500+' },
  ];

  readonly products: Product[] = [
    // … copia tal-cual el array “products” del React …
    {
      id: 1,
      name: 'Escritorio Ejecutivo Premium',
      price: 599.99,
      originalPrice: 749.99,
      image: 'https://readdy.ai/api/search-image?query=Premium%20executive%20office%20desk%20with%20modern%20design%2C%20dark%20wood%20finish%2C%20spacious%20work%20surface%2C%20clean%20white%20background%2C%20professional%20furniture%20photography%2C%20contemporary%20style&width=400&height=400&seq=101&orientation=squarish',
      category: 'escritorios',
      rating: 4.9,
      reviews: 156,
      stock: 8,
      isNew: false,
      discount: 20,
    },
    // … resto de productos …
  ];

  /* ---------- computed signals ---------- */
  readonly filteredProducts = signal<Product[]>([]);
  readonly sortedProducts = signal<Product[]>([]);
  readonly paginatedProducts = signal<Product[]>([]);
  readonly totalPages = signal<number>(1);

  constructor() {
    this.applyFilters();
  }

  /* ---------- actions ---------- */
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

  setSort(value: string) {
    this.sortBy.set(value);
    this.isSortOpen.set(false);
    this.applyFilters();
  }

  resetFilters() {
    this.selectedSubcategory.set('all');
    this.priceRange.set('all');
    this.currentPage.set(1);
    this.applyFilters();
  }

  /* ---------- lógica ---------- */
  private applyFilters() {
    let filtered = this.products.filter((p) => {
      if (this.selectedSubcategory() !== 'all' && p.category !== this.selectedSubcategory())
        return false;

      if (this.priceRange() !== 'all') {
        const price = p.price;
        switch (this.priceRange()) {
          case '0-100':
            return price <= 100;
          case '100-300':
            return price >= 100 && price <= 300;
          case '300-500':
            return price >= 300 && price <= 500;
          case '500+':
            return price >= 500;
        }
      }
      return true;
    });

    // orden
    const sorted = [...filtered].sort((a, b) => {
      switch (this.sortBy()) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    // paginado
    const total = Math.ceil(sorted.length / this.itemsPerPage);
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const page = sorted.slice(start, start + this.itemsPerPage);

    this.filteredProducts.set(filtered);
    this.sortedProducts.set(sorted);
    this.totalPages.set(total);
    this.paginatedProducts.set(page);
  }

  /* helpers para la plantilla */
  categoryLabel(cat: string): string {
    switch (cat) {
      case 'escritorios':
        return 'Escritorios';
      case 'sillas':
        return 'Sillas';
      case 'estanterias':
        return 'Estanterías';
      case 'organizadores':
        return 'Organizadores';
      case 'accesorios':
        return 'Accesorios';
      default:
        return 'Mobiliario';
    }
  }

  navigateToProduct() {
    // Angular no tiene “window.REACT_APP_NAVIGATE”; usa el Router:
    // this.router.navigate(['/product']);
    console.warn('navigateToProduct -> implementar Router');
  }
}