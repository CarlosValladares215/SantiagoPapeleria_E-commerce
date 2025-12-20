import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';


import { Header } from '../../shared/header/header.component';
import { Footer } from '../../shared/footer/footer.component';
import { CartSidebarComponent } from '../../shared/header/cart-sidebar/cart-sidebar.component';


@Component({
  selector: 'app-public',
  imports: [RouterOutlet, Header, Footer, CartSidebarComponent],
  templateUrl: './public.html',
  styleUrl: './public.scss',
})
export class Public { }
