import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Category { id: string; name: string; icon: string; }

@Component({
  selector: 'app-category-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-filter.html',
  styleUrls: ['./category-filter.scss']
})
export class CategoryFilterComponent {
  @Input({ required: true }) categories!: Category[];
  @Input({ required: true }) selectedCategory!: string;
  @Output() categoryChange = new EventEmitter<string>();
}