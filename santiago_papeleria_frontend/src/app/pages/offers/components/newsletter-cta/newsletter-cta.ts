import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-newsletter-cta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './newsletter-cta.html',
  styleUrls: ['./newsletter-cta.scss']
})
export class NewsletterCtaComponent {
  email = '';
}