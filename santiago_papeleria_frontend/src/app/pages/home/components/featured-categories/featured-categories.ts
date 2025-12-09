import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-featured-categories',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './featured-categories.html',
  styleUrl: './featured-categories.scss',
})
export class FeaturedCategories {
  categories = [
    {
      id: 1,
      name: 'Útiles Escolares',
      description: 'Cuadernos, lápices, colores y más',
      image: 'assets/home/categories/school.jpg',
      productCount: '5,200+'
    },
    {
      id: 2,
      name: 'Suministros de Oficina',
      description: 'Papel, carpetas, archivadores',
      image: 'assets/home/categories/office.jpg',
      productCount: '8,500+'
    },
    {
      id: 3,
      name: 'Tecnología',
      description: 'Calculadoras, impresoras, accesorios',
      image: 'assets/home/categories/tech.jpg',
      productCount: '2,800+'
    },
    {
      id: 4,
      name: 'Arte y Manualidades',
      description: 'Pinturas, pinceles, materiales creativos',
      image: 'assets/home/categories/art.jpg',
      productCount: '3,200+'
    },
    {
      id: 5,
      name: 'Mobiliario',
      description: 'Escritorios, sillas, estanterías',
      image: 'assets/home/categories/furtniture.jpg',
      productCount: '1,500+'
    }
  ];
}
