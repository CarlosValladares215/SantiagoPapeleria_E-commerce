import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../../shared/header/header.component';
import { Footer } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-public',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './public.html',
  styleUrl: './public.scss',
})
export class Public { }
