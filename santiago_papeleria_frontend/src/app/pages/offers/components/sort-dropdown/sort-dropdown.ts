import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sort-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sort-dropdown.html',
  styleUrls: ['./sort-dropdown.scss']
})
export class SortDropdownComponent {
  @Input({ required: true }) sortBy!: string;
  @Input({ required: true }) showSortMenu!: boolean;
  @Output() sortChange = new EventEmitter<string>();
  @Output() toggleSortMenu = new EventEmitter<void>();
}