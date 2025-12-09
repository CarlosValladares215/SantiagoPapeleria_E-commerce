import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-breadcrumb.html',
  styleUrls: ['./product-breadcrumb.scss']
})
export class ProductBreadcrumb {

  @Input() category!: string;
  @Input() categoryPath!: string;
  @Input() productName!: string;
}
