import { Component } from '@angular/core';

@Component({
  selector: 'app-sucursales',
  imports: [],
  templateUrl: './sucursales.html',
  styleUrl: './sucursales.scss',
})
export class Sucursales {
  openMap(url: string) {
    window.open(url, '_blank');
  }
}
