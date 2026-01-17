import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
})
export class SearchBar {
  searchQuery: string = '';

  constructor(private router: Router) { }

  performSearch() {
    const q = this.searchQuery.trim();
    if (!q) return;

    this.router.navigate(['/products'], {
      queryParams: { search: q }
    });
  }
}
