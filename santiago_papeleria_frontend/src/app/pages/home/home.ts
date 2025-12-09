import { Component } from '@angular/core';
import { HeroSection } from './components/hero-section/hero-section';
import { TrustBadges } from './components/trust-badges/trust-badges';
import { FeaturedCategories } from './components/featured-categories/featured-categories';
import { FeaturedProducts } from './components/featured-products/featured-products';
import { NewsletterSection } from './components/newsletter-section/newsletter-section';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeroSection,
    TrustBadges,
    FeaturedCategories,
    FeaturedProducts,
    NewsletterSection,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
