import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductReview } from '../../../../models/product.model';
import { ProductService } from '../../../../services/product/product.service';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-reviews.html',
  styleUrls: ['./product-reviews.scss'],
})
export class ProductReviews {
  @Input() reviews: ProductReview[] | null | undefined = [];
  @Input() productId: string | undefined;

  isWriting = signal(false);
  isSubmitting = signal(false);

  // Form Data
  newReview = signal({
    user_name: '',
    rating: 5,
    comment: ''
  });

  // Sorting
  sortBy = signal<'newest' | 'highest' | 'lowest'>('newest');

  constructor(private productService: ProductService) { }

  // Promedio de calificación
  avgRating = computed(() => {
    if (!this.reviews || this.reviews.length === 0) return 0;
    return (
      this.reviews.reduce((acc, r) => acc + r.rating, 0) / this.reviews.length
    );
  });

  // Sorted Reviews
  sortedReviews = computed(() => {
    const list = this.reviews || [];
    const sort = this.sortBy();

    return [...list].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      if (sort === 'newest') return dateB - dateA;
      if (sort === 'highest') return b.rating - a.rating;
      if (sort === 'lowest') return a.rating - b.rating;
      return 0;
    });
  });

  // Cuántas reseñas por estrella
  ratingCount(stars: number): number {
    if (!this.reviews) return 0;
    return this.reviews.filter(r => r.rating === stars).length;
  }

  ratingPercent(stars: number): number {
    if (!this.reviews || this.reviews.length === 0) return 0;
    return Math.round((this.ratingCount(stars) / this.reviews.length) * 100);
  }

  getStarsArray(n: number): number[] {
    return Array(n).fill(0);
  }

  toggleWrite() {
    this.isWriting.update(v => !v);
  }

  setRating(stars: number) {
    this.newReview.update(v => ({ ...v, rating: stars }));
  }

  setSort(e: any) {
    this.sortBy.set(e.target.value);
  }

  submitReview() {
    const data = this.newReview();
    if (!this.productId || !data.user_name || !data.comment) return;

    this.isSubmitting.set(true);
    this.productService.addReview(this.productId, data).subscribe({
      next: (updatedProduct) => {
        // Parent component (Product) signal updates automatically? 
        // No, ProductService.selectedProduct should update if we called mapProduct?
        // Actually, we must update the local reviews or reload.
        // ProductService.fetchProductById reloads data.
        this.productService.fetchProductById(this.productId!);

        this.isSubmitting.set(false);
        this.isWriting.set(false);
        this.newReview.set({ user_name: '', rating: 5, comment: '' });
      },
      error: () => {
        this.isSubmitting.set(false);
        alert('Error al enviar reseña');
      }
    });
  }
}