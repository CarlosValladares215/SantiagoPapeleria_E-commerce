import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './categories.html',
  styleUrls: ['./categories.scss'],
})
export class Categories {}
