import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../header/header.component';
import { Footer } from '../../footer/footer';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [RouterOutlet, Header, Footer],
    templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent { }
