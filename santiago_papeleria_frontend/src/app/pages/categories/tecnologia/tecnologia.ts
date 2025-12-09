import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

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
  selector: 'app-tecnologia',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tecnologia.html',
  styleUrl: './tecnologia.scss',
})
export class Tecnologia {
  /* ------------------- Signals ------------------- */
  selectedSubcategory = signal<string>('all');
  priceRange = signal<string>('all');
  sortBy = signal<string>('featured');
  isSortOpen = signal<boolean>(false);
  currentPage = signal<number>(1);
  readonly itemsPerPage = 12;

  /* ------------------- Tecno categories ------------------- */
  readonly subcategories: Subcategory[] = [
    { id: 'all', name: 'Todos los Productos', count: 152 },
    { id: 'computo', name: 'Computadores y Laptops', count: 22 },
    { id: 'perifericos', name: 'Teclados, Mouse y Accesorios', count: 31 },
    { id: 'audio', name: 'Audio y Auriculares', count: 28 },
    { id: 'almacenamiento', name: 'Memorias y Almacenamiento', count: 26 },
    { id: 'impresion', name: 'Impresoras y Tintas', count: 19 },
    { id: 'redes', name: 'Routers y Redes', count: 14 },
    { id: 'soportes', name: 'Soportes y Accesorios', count: 12 },
  ];

  /* ------------------- Products ------------------- */
  readonly products: Product[] = [
  {
    id: 1,
    name: 'Laptop Lenovo IdeaPad 15.6” Ryzen 5',
    price: 580,
    originalPrice: 650,
    image: 'assets/Filtro/tecnologia/img1.jpg',
    category: 'computo',
    stock: 14,
    isNew: true,
    discount: 11,
  },
  {
    id: 2,
    name: 'Teclado Mecánico RGB Redragon K552',
    price: 45,
    originalPrice: 60,
    image: 'assets/Filtro/tecnologia/img2.jpg',
    category: 'perifericos',
    stock: 38,
    isNew: false,
    discount: 25,
  },
  {
    id: 3,
    name: 'Mouse Gamer Logitech G203 Lightsync',
    price: 23,
    originalPrice: null,
    image: 'assets/Filtro/tecnologia/img3.jpg',
    category: 'perifericos',
    stock: 54,
    isNew: true,
    discount: 0,
  },
  {
    id: 4,
    name: 'Audífonos Inalámbricos Sony WH-CH520',
    price: 72,
    originalPrice: 90,
    image: 'assets/Filtro/tecnologia/img4.jpg',
    category: 'audio',
    stock: 10,
    isNew: false,
    discount: 20,
  },
  {
    id: 5,
    name: 'SSD Kingston 480GB A400',
    price: 29,
    originalPrice: 39,
    image: 'assets/Filtro/tecnologia/img5.jpg',
    category: 'almacenamiento',
    stock: 71,
    isNew: false,
    discount: 26,
  },
  {
    id: 6,
    name: 'Router TP-Link Archer C6 Wi-Fi AC1200',
    price: 38,
    originalPrice: null,
    image: 'assets/Filtro/tecnologia/img6.jpg',
    category: 'redes',
    stock: 17,
    isNew: true,
    discount: 0,
  },
];


  /* ------------------- Computed Signals ------------------- */
  filteredProducts = signal<Product[]>([]);
  sortedProducts = signal<Product[]>([]);
  paginatedProducts = signal<Product[]>([]);
  totalPages = signal<number>(1);

  constructor(private router: Router) {
    this.applyFilters();
  }

  /* ------------------- Filtering ------------------- */
  setSubcategory(id: string) {
    this.selectedSubcategory.set(id);
    this.currentPage.set(1);
    this.applyFilters();
  }

  setPrice(id: string) {
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

  /* ------------------- Core filtering logic ------------------- */
  private applyFilters() {
    let filtered = this.products.filter((p) => {
      if (this.selectedSubcategory() !== 'all' && p.category !== this.selectedSubcategory())
        return false;

      switch (this.priceRange()) {
        case 'under50':
          return p.price < 50;
        case '50to150':
          return p.price >= 50 && p.price <= 150;
        case 'over150':
          return p.price > 150;
      }

      return true;
    });

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

    const total = Math.ceil(sorted.length / this.itemsPerPage);
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const page = sorted.slice(start, start + this.itemsPerPage);

    this.filteredProducts.set(filtered);
    this.sortedProducts.set(sorted);
    this.totalPages.set(total);
    this.paginatedProducts.set(page);
  }

  /* ------------------- Helpers ------------------- */
  categoryLabel(cat: string): string {
    switch (cat) {
      case 'computo': return 'Computadores y Laptops';
      case 'perifericos': return 'Periféricos y Accesorios';
      case 'audio': return 'Audio y Auriculares';
      case 'almacenamiento': return 'Memorias y Almacenamiento';
      case 'impresion': return 'Impresión y Tintas';
      case 'redes': return 'Redes y Routers';
      case 'soportes': return 'Soportes y Accesorios';
      default: return 'Tecnología';
    }
  }

  navigateToProduct(id: number) {
    this.router.navigate(['/product'], { queryParams: { id } });
  }
}
