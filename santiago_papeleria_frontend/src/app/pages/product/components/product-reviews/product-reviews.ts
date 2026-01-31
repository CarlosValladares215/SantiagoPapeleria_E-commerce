import { Component, Input, computed, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProductReview } from '../../../../models/product.model';
import { ProductService } from '../../../../services/product/product.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-reviews.html',
  styleUrls: ['./product-reviews.scss'],
})
export class ProductReviews implements OnInit {
  @Input() reviews: ProductReview[] | null | undefined = [];
  @Input() productId: string | undefined;

  isWriting = signal(false);
  isSubmitting = signal(false);
  isEligible = signal(false);
  loadingEligibility = signal(true);

  // Character limits
  readonly minCommentLength = 10;
  readonly maxCommentLength = 500;

  // Form Data
  newReview = signal({
    user_name: '',
    rating: 5,
    comment: ''
  });

  // Sorting
  sortBy = signal<'newest' | 'highest' | 'lowest'>('newest');

  constructor(
    public productService: ProductService,
    public authService: AuthService,
    private toastService: ToastService
  ) {
    // Re-check eligibility if user changes
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.checkEligibility();
      } else {
        this.isEligible.set(false);
        this.loadingEligibility.set(false);
      }
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.checkEligibility();
      // Auto-set name from user profile
      const user = this.authService.user();
      if (user) {
        this.newReview.update(v => ({ ...v, user_name: user.nombres }));
      }
    } else {
      this.loadingEligibility.set(false);
    }
  }

  checkEligibility() {
    if (!this.productId) return;
    this.loadingEligibility.set(true);
    this.productService.checkReviewEligibility(this.productId).subscribe({
      next: (res) => {
        this.isEligible.set(res.canReview);
        this.loadingEligibility.set(false);
      },
      error: () => {
        this.isEligible.set(false);
        this.loadingEligibility.set(false);
      }
    });
  }

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
    if (!this.authService.isAuthenticated()) {
      this.toastService.info('Inicia sesión para escribir una reseña');
      return;
    }
    if (!this.isEligible()) {
      this.toastService.error('Solo los compradores verificados pueden dejar reseñas.');
      return;
    }
    this.isWriting.update(v => !v);
  }

  setRating(stars: number) {
    this.newReview.update(v => ({ ...v, rating: stars }));
  }

  setSort(e: any) {
    this.sortBy.set(e.target.value);
  }

  get isCommentValid(): boolean {
    const comment = this.newReview().comment.trim();
    return comment.length >= this.minCommentLength && comment.length <= this.maxCommentLength;
  }

  submitReview() {
    const data = this.newReview();
    if (!this.productId || !this.isCommentValid || !data.user_name) {
      if (!this.isCommentValid) {
        this.toastService.error(`El comentario debe tener entre ${this.minCommentLength} y ${this.maxCommentLength} caracteres.`);
      }
      return;
    }

    this.isSubmitting.set(true);
    this.productService.addReview(this.productId, data).subscribe({
      next: () => {
        this.productService.fetchProductById(this.productId!);
        this.toastService.success('¡Gracias por tu opinión! Tu reseña ha sido publicada.');
        this.isSubmitting.set(false);
        this.isWriting.set(false);
        this.newReview.set({
          user_name: this.authService.user()?.nombres || '',
          rating: 5,
          comment: ''
        });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const errorMessage = err.error?.message || 'Error al enviar la reseña. Por favor intenta más tarde.';
        this.toastService.error(errorMessage);
      }
    });
  }
}
