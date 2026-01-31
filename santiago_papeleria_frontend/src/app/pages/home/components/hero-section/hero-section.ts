import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.scss',
})
export class HeroSection implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('carouselTrack', { static: false }) carouselTrack!: ElementRef<HTMLDivElement>;

  private currentSlide = 0;
  private totalSlides = 4;
  private autoSlideInterval: any;
  private isDragging = false;
  private startX = 0;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngAfterViewInit(): void {
    this.setupTouchEvents();
    this.updateActiveSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  // Navegación a productos al hacer clic en cualquier slide
  navigateToProducts(): void {
    this.router.navigate(['/products']);
  }

  // Control del slider
  goToSlide(index: number): void {
    this.currentSlide = index;
    this.updateSlider();
    this.resetAutoSlide();
    this.updateActiveSlide();
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
    this.updateSlider();
    this.resetAutoSlide();
    this.updateActiveSlide();
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
    this.updateSlider();
    this.resetAutoSlide();
    this.updateActiveSlide();
  }

  private updateSlider(): void {
    if (!this.carouselTrack?.nativeElement) return;

    const track = this.carouselTrack.nativeElement;
    track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    track.style.transform = `translateX(-${this.currentSlide * 100}%)`;
  }

  private updateActiveSlide(): void {
    if (!this.carouselTrack?.nativeElement) return;

    const slides = this.carouselTrack.nativeElement.querySelectorAll('.carousel-slide');
    slides.forEach((slide, index) => {
      if (index === this.currentSlide) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });
  }

  // Auto slide
  private startAutoSlide(): void {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Cambia cada 5 segundos
  }

  private stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  private resetAutoSlide(): void {
    this.stopAutoSlide();
    this.startAutoSlide();
  }

  // Touch events para móviles
  private setupTouchEvents(): void {
    if (!this.carouselTrack?.nativeElement) return;

    const track = this.carouselTrack.nativeElement;

    track.addEventListener('touchstart', (e: TouchEvent) => {
      this.startX = e.touches[0].clientX;
      this.isDragging = true;
      track.style.transition = 'none';
      this.stopAutoSlide();
    }, { passive: true });

    track.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.isDragging) return;

      const currentX = e.touches[0].clientX;
      const diff = this.startX - currentX;

      const offset = -this.currentSlide * 100 + (diff / window.innerWidth * 100);
      track.style.transform = `translateX(${offset}%)`;
    }, { passive: true });

    track.addEventListener('touchend', (e: TouchEvent) => {
      if (!this.isDragging) return;
      this.isDragging = false;

      const endX = e.changedTouches[0].clientX;
      const diff = this.startX - endX;
      const swipeThreshold = 50;

      track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
          this.nextSlide();
        } else {
          this.prevSlide();
        }
      } else {
        this.updateSlider();
      }

      this.startAutoSlide();
    }, { passive: true });
  }

  // Navegación por teclado
  @HostListener('window:keydown', ['$event'])
  handleKeyboardNavigation(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prevSlide();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextSlide();
    }
  }
}