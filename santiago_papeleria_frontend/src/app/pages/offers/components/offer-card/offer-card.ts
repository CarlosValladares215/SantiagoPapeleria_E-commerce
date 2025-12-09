import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Offer {
  id: number; name: string; originalPrice: number; discountPrice: number;
  discount: number; image: string; category: string; stock: number; endDate: string;
}

@Component({
  selector: 'app-offer-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterModule],
  templateUrl: './offer-card.html',
  styleUrls: ['./offer-card.scss']
})
export class OfferCardComponent {
  @Input({ required: true }) offer!: Offer;
}