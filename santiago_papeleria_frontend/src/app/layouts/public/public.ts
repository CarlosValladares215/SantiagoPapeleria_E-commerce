import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../../shared/header/header.component';
import { Footer } from '../../shared/footer/footer.component';
import { CartSidebarComponent } from '../../shared/header/cart-sidebar/cart-sidebar.component';
import { FloatingCartComponent } from '../../shared/components/floating-cart/floating-cart.component';

// New modular chatbot from features
import { ChatWidgetComponent } from '../../features/chatbot';

@Component({
  selector: 'app-public',
  imports: [RouterOutlet, Header, Footer, CartSidebarComponent, FloatingCartComponent, ChatWidgetComponent],
  templateUrl: './public.html',
  styleUrl: './public.scss',
})
export class Public { }
