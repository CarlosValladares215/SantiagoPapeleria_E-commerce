import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FiltersService {

  /** Estado actual de los filtros */
  current = signal({
    category: '',
    priceRange: [0, 9999] as [number, number],
    inStock: false,
  });

  /** Categorías que usará el panel */
  categories = [
    { id: '', name: 'Todos', count: 245 },
    { id: 'utiles-escolares', name: 'Útiles Escolares', count: 67 },
    { id: 'suministros-oficina', name: 'Suministros de Oficina', count: 89 },
    { id: 'arte-manualidades', name: 'Arte y Manualidades', count: 45 },
    { id: 'tecnologia', name: 'Tecnología', count: 28 },
    { id: 'mobiliario', name: 'Mobiliario', count: 16 },
  ];

  /** Rango de precios */
  priceRanges = [
    { min: 0, max: 9999, label: 'Todos los precios' },
    { min: 0, max: 5, label: 'Menos de $5' },
    { min: 5, max: 15, label: '$5 - $15' },
    { min: 15, max: 9999, label: 'Más de $15' },
  ];

  /** CATEGORY */
  setCategory(category: string) {
    this.current.update(f => ({ ...f, category }));
  }

  /** PRICE RANGE */
  setPriceRange(min: number, max: number) {
    this.current.update(f => ({ ...f, priceRange: [min, max] }));
  }

  /** IN STOCK */
  setInStock(value: boolean) {
    this.current.update(f => ({ ...f, inStock: value }));
  }

  /** RESET FILTERS */
  resetFilters() {
    this.current.set({
      category: '',
      priceRange: [0, 9999],
      inStock: false
    });
  }
}
