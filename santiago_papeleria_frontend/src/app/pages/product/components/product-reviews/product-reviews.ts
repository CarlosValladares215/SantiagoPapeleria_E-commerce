import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductReview } from '../../../../models/product.model';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-reviews.html',
  styleUrls: ['./product-reviews.scss'],
})
export class ProductReviews {
  @Input() reviews: ProductReview[] | null | undefined = [];

  // Promedio de calificación
  avgRating = computed(() => {
    if (!this.reviews || this.reviews.length === 0) return 0;
    return (
      this.reviews.reduce((acc, r) => acc + r.rating, 0) / this.reviews.length
    );
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
}