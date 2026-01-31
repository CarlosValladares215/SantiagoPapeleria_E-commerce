import { Component, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
})
export class SearchBar {
  searchQuery: string = '';
  isExpanded = signal<boolean>(false);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  constructor(private router: Router) { }

  performSearch() {
    const q = this.searchQuery.trim();
    if (!q) return;

    this.router.navigate(['/products'], {
      queryParams: { search: q }
    });

    // Cerrar búsqueda después de buscar en móvil
    this.closeSearch();
  }

  toggleSearch() {
    if (this.isExpanded()) {
      this.closeSearch();
    } else {
      this.openSearch();
    }
  }

  openSearch() {
    this.isExpanded.set(true);
    // Focus en el input después de abrir
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 100);
  }

  closeSearch() {
    this.isExpanded.set(false);
    this.searchQuery = '';
  }

  // Cerrar al hacer clic fuera
  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isExpanded()) {
      this.closeSearch();
    }
  }
}
