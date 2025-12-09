import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-newsletter-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './newsletter-section.html',
  styleUrl: './newsletter-section.scss',
})
export class NewsletterSection {
  email = '';
  isSubmitted = false;

  handleSubmit(event: Event) {
    event.preventDefault();
    this.isSubmitted = true;
    this.email = '';
  }
}
