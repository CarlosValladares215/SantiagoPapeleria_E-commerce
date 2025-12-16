import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../header/header.component';
import { Footer } from '../../footer/footer';
import { CartSidebarComponent } from '../../header/cart-sidebar/cart-sidebar.component';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [RouterOutlet, Header, Footer, CartSidebarComponent],
    templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent { }
