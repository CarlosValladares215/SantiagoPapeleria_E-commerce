import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryFilterComponent } from './components/category-filter/category-filter';
import { SortDropdownComponent }   from './components/sort-dropdown/sort-dropdown';
import { OfferCardComponent }      from './components/offer-card/offer-card';
import { NewsletterCtaComponent }  from './components/newsletter-cta/newsletter-cta';

interface Category { id: string; name: string; icon: string; }
interface Offer {
  id: number; name: string; originalPrice: number; discountPrice: number;
  discount: number; image: string; category: string; stock: number; endDate: string;
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    CommonModule,
    CategoryFilterComponent,
    SortDropdownComponent,
    OfferCardComponent,
    NewsletterCtaComponent
  ],
  templateUrl: './offers.html',
  styleUrls: ['./offers.scss']
})
export class Offers {
  selectedCategory = signal<string>('all');
  sortBy           = signal<string>('discount');
  showSortMenu     = signal<boolean>(false);

  categories: Category[] = [
    { id: 'all', name: 'Todas', icon: 'ri-apps-line' },
    { id: 'school', name: 'Útiles Escolares', icon: 'ri-pencil-line' },
    { id: 'office', name: 'Suministros de Oficina', icon: 'ri-briefcase-line' },
    { id: 'tech', name: 'Tecnología', icon: 'ri-computer-line' },
    { id: 'art', name: 'Arte y Manualidades', icon: 'ri-palette-line' },
    { id: 'furniture', name: 'Mobiliario', icon: 'ri-home-office-line' }
  ];

  offers: Offer[] = [
    {
      id: 1, name: 'Cuaderno Universitario Norma 100 Hojas', originalPrice: 3.50, discountPrice: 2.45, discount: 30,
      image: 'https://readdy.ai/api/search-image?query=University%20notebook%20Norma%20brand%20100%20pages%20spiral%20bound%20with%20colorful%20cover%20on%20clean%20white%20background%2C%20professional%20educational%20stationery%20photography%20style&width=300&height=300&seq=notebook-offer&orientation=squarish',
      category: 'school', stock: 150, endDate: '2024-02-15'
    },
    {
      id: 2, name: 'Set de Bolígrafos Pilot G2 x12 Unidades', originalPrice: 18.90, discountPrice: 12.99, discount: 31,
      image: 'https://readdy.ai/api/search-image?query=Pilot%20G2%20pen%20set%2012%20units%20blue%20black%20red%20colors%20professional%20writing%20instruments%20arranged%20on%20clean%20white%20background%2C%20office%20supplies%20photography&width=300&height=300&seq=pen-set-offer&orientation=squarish',
      category: 'office', stock: 85, endDate: '2024-02-10'
    },
    {
      id: 3, name: 'Calculadora Científica Casio FX-991ES Plus', originalPrice: 45.00, discountPrice: 29.99, discount: 33,
      image: 'assets/home/products/casio.jpg',
      category: 'tech', stock: 42, endDate: '2024-02-20'
    },
    {
      id: 4, name: 'Set de Colores Faber-Castell 48 Unidades', originalPrice: 25.80, discountPrice: 17.99, discount: 30,
      image: 'https://readdy.ai/api/search-image?query=Faber-Castell%20colored%20pencils%20set%2048%20units%20vibrant%20colors%20art%20supplies%20arranged%20in%20organized%20display%20on%20clean%20white%20background%2C%20creative%20materials%20photography&width=300&height=300&seq=colors-offer&orientation=squarish',
      category: 'art', stock: 67, endDate: '2024-02-18'
    },
    {
      id: 5, name: 'Archivador A-Z Oficio con Palanca', originalPrice: 8.50, discountPrice: 5.99, discount: 30,
      image: 'https://readdy.ai/api/search-image?query=Office%20binder%20A-Z%20lever%20arch%20file%20folder%20blue%20professional%20document%20organizer%20on%20clean%20white%20background%2C%20office%20supplies%20photography&width=300&height=300&seq=binder-offer&orientation=squarish',
      category: 'office', stock: 120, endDate: '2024-02-25'
    },
    {
      id: 6, name: 'Impresora HP DeskJet 2720 Multifunción', originalPrice: 189.99, discountPrice: 139.99, discount: 26,
      image: 'https://readdy.ai/api/search-image?query=HP%20DeskJet%202720%20multifunction%20printer%20white%20compact%20design%20on%20clean%20white%20background%2C%20modern%20office%20technology%20equipment%20photography&width=300&height=300&seq=printer-offer&orientation=squarish',
      category: 'tech', stock: 15, endDate: '2024-02-12'
    },
    {
      id: 7, name: 'Silla Ergonómica de Oficina con Respaldo', originalPrice: 159.99, discountPrice: 99.99, discount: 38,
      image: 'https://readdy.ai/api/search-image?query=Ergonomic%20office%20chair%20black%20with%20backrest%20modern%20professional%20furniture%20on%20clean%20white%20background%2C%20workspace%20equipment%20photography&width=300&height=300&seq=chair-offer&orientation=squarish',
      category: 'furniture', stock: 8, endDate: '2024-02-14'
    },
    {
      id: 8, name: 'Mochila Escolar Resistente con Compartimentos', originalPrice: 35.00, discountPrice: 24.99, discount: 29,
      image: 'https://readdy.ai/api/search-image?query=Durable%20school%20backpack%20with%20multiple%20compartments%20blue%20color%20modern%20design%20on%20clean%20white%20background%2C%20student%20supplies%20photography&width=300&height=300&seq=backpack-offer&orientation=squarish',
      category: 'school', stock: 95, endDate: '2024-02-22'
    }
  ];

  filteredOffers = computed(() =>
    this.selectedCategory() === 'all'
      ? this.offers
      : this.offers.filter(o => o.category === this.selectedCategory())
  );

  sortedOffers = computed(() => {
    const list = [...this.filteredOffers()];
    switch (this.sortBy()) {
      case 'discount':   return list.sort((a, b) => b.discount - a.discount);
      case 'price-low':  return list.sort((a, b) => a.discountPrice - b.discountPrice);
      case 'price-high': return list.sort((a, b) => b.discountPrice - a.discountPrice);
      case 'name':       return list.sort((a, b) => a.name.localeCompare(b.name));
      default:           return list;
    }
  });

  onCategoryChange(cat: string) { this.selectedCategory.set(cat); }
  onSortChange(sort: string)     { this.sortBy.set(sort); this.showSortMenu.set(false); }
  toggleSortMenu()               { this.showSortMenu.update(v => !v); }
  trackById(_: number, o: Offer) { return o.id; }
}