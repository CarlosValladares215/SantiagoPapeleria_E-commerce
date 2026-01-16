import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';


import { Header } from '../../shared/header/header.component';
import { Footer } from '../../shared/footer/footer.component';
import { CartSidebarComponent } from '../../shared/header/cart-sidebar/cart-sidebar.component';
import { ChatbotComponent } from '../../shared/components/chatbot/chatbot.component';
import { FloatingCartComponent } from '../../shared/components/floating-cart/floating-cart.component';


@Component({
  selector: 'app-public',
  imports: [RouterOutlet, Header, Footer, CartSidebarComponent, ChatbotComponent, FloatingCartComponent],
  templateUrl: './public.html',
  styleUrl: './public.scss',
})
export class Public { }
