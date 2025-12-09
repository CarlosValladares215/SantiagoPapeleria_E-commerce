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
  selector: 'app-suministros-oficina',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './suministros-oficina.html',
  styleUrl: './suministros-oficina.scss',
})
export class SuministrosOficina {
  /* ---------------- signals ---------------- */
  selectedSubcategory = signal<string>('all');
  priceRange = signal<string>('all');       // 'under20' | '20to50' | 'over50'
  sortBy = signal<string>('featured');
  isSortOpen = signal<boolean>(false);
  currentPage = signal<number>(1);
  readonly itemsPerPage = 12;

  /* ---------------- data ---------------- */
  readonly subcategories: Subcategory[] = [
    { id: 'all', name: 'Todos los Productos', count: 189 },
    { id: 'papel', name: 'Papel y Sobres', count: 42 },
    { id: 'archivadores', name: 'Archivadores', count: 35 },
    { id: 'grapadoras', name: 'Grapadoras y Clips', count: 28 },
    { id: 'organizadores', name: 'Organizadores', count: 31 },
    { id: 'etiquetas', name: 'Etiquetas', count: 24 },
    { id: 'calculadoras', name: 'Calculadoras', count: 18 },
    { id: 'accesorios', name: 'Accesorios de Escritorio', count: 29 },
  ];

  readonly products: Product[] = [
  {
    id: 1,
    name: 'Resma Papel Bond A4 75g x500 Hojas',
    price: 4.50,
    originalPrice: 5.50,
    image: 'assets/Filtro/oficina/img1.jpg',
    category: 'papel',
    stock: 245,
    isNew: false,
    discount: 18,
  },
  {
    id: 2,
    name: 'Archivador Palanca Oficio Norma',
    price: 3.75,
    originalPrice: null,
    image: 'assets/Filtro/oficina/img2.jpg',
    category: 'archivadores',
    stock: 156,
    isNew: true,
    discount: 0,
  },
  {
    id: 3,
    name: 'Grapadora de Escritorio Rapid HD70',
    price: 18.00,
    originalPrice: 22.00,
    image: 'assets/Filtro/oficina/img3.jpg',
    category: 'grapadoras',
    stock: 34,
    isNew: false,
    discount: 18,
  },
  {
    id: 4,
    name: 'Organizador de Escritorio 5 Compartimentos',
    price: 12.50,
    originalPrice: null,
    image: 'assets/Filtro/oficina/img4.jpg',
    category: 'organizadores',
    stock: 67,
    isNew: true,
    discount: 0,
  },
  {
    id: 5,
    name: 'Etiquetas Autoadhesivas Avery 100 Hojas',
    price: 8.25,
    originalPrice: 10.00,
    image: 'assets/Filtro/oficina/img5.jpg',
    category: 'etiquetas',
    stock: 89,
    isNew: false,
    discount: 18,
  },
  {
    id: 6,
    name: 'Calculadora Científica Casio FX-991',
    price: 25.00,
    originalPrice: null,
    image: 'assets/Filtro/oficina/img6.jpg',
    category: 'calculadoras',
    stock: 45,
    isNew: true,
    discount: 0,
  },
  {
    id: 7,
    name: 'Sobres Manila Oficio x100',
    price: 6.50,
    originalPrice: 7.50,
    image: 'assets/Filtro/oficina/img7.jpg',
    category: 'papel',
    stock: 178,
    isNew: false,
    discount: 13,
  },
];


  /* ------------- computed signals ------------- */
  filteredProducts = signal<Product[]>([]);
  sortedProducts = signal<Product[]>([]);
  paginatedProducts = signal<Product[]>([]);
  totalPages = signal<number>(1);

  constructor(private router: Router) {
    this.applyFilters();
  }

  /* ------------------- actions ------------------- */
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

  /* ------------------- core logic ------------------- */
  private applyFilters() {
    let filtered = this.products.filter((p) => {
      if (this.selectedSubcategory() !== 'all' && p.category !== this.selectedSubcategory())
        return false;

      switch (this.priceRange()) {
        case 'under20':
          return p.price < 20;
        case '20to50':
          return p.price >= 20 && p.price <= 50;
        case 'over50':
          return p.price > 50;
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

  /* ------------------- helpers ------------------- */
  categoryLabel(cat: string): string {
    switch (cat) {
      case 'papel': return 'Papel y Sobres';
      case 'archivadores': return 'Archivadores';
      case 'grapadoras': return 'Grapadoras y Clips';
      case 'organizadores': return 'Organizadores';
      case 'etiquetas': return 'Etiquetas';
      case 'calculadoras': return 'Calculadoras';
      case 'accesorios': return 'Accesorios de Escritorio';
      default: return 'Suministros de Oficina';
    }
  }

  navigateToProduct(id: number) {
  window.location.href = 'http://localhost:4200/products/1';
}
  /*
  navigateToProduct(id: number) {
    this.router.navigate(['/product'], { queryParams: { id } });
  }
    */
}
