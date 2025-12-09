import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  wholesalePrice: number;
  image: string;
  stock: number;
  category: string;
  isLowStock: boolean;
}

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [RouterModule, CommonModule],   // ← NECESARIO PARA ngClass
  templateUrl: './featured-products.html',
  styleUrl: './featured-products.scss',
})
export class FeaturedProducts {

  products = [
    {
      id: 1,
      name: 'Cuaderno Universitario 100 Hojas',
      brand: 'Norma',
      price: 2.50,
      wholesalePrice: 2.10,
      image: 'assets/home/products/notebook.jpg',
      stock: 150,
      category: 'Útiles Escolares',
      isLowStock: false
    },
    {
      id: 2,
      name: 'Bolígrafo BIC Cristal Azul (Caja 50 unidades)',
      brand: 'BIC',
      price: 25.00,
      wholesalePrice: 20.00,
      image: 'assets/home/products/bic-box.jpg',
      stock: 3,
      category: 'Suministros de Oficina',
      isLowStock: true
    },
    {
      id: 3,
      name: 'Resma Papel Bond A4 75g (500 hojas)',
      brand: 'Reprograf',
      price: 4.80,
      wholesalePrice: 4.20,
      image: 'assets/home/products/paper-a4.jpg',
      stock: 89,
      category: 'Suministros de Oficina',
      isLowStock: false
    },
    {
      id: 4,
      name: 'Calculadora Científica Casio FX-570',
      brand: 'Casio',
      price: 35.00,
      wholesalePrice: 30.00,
      image: 'assets/home/products/casio.jpg',
      stock: 25,
      category: 'Tecnología',
      isLowStock: false
    },
    {
      id: 5,
      name: 'Set Marcadores Sharpie 12 Colores',
      brand: 'Sharpie',
      price: 18.50,
      wholesalePrice: 15.80,
      image: 'assets/home/products/sharpie.jpg',
      stock: 0,
      category: 'Arte y Manualidades',
      isLowStock: false
    },
    {
      id: 6,
      name: 'Archivador Palanca A4 Lomo Ancho',
      brand: 'Leitz',
      price: 8.90,
      wholesalePrice: 7.50,
      image: 'assets/home/products/binder.jpg',
      stock: 45,
      category: 'Suministros de Oficina',
      isLowStock: false
    }
  ];


}
