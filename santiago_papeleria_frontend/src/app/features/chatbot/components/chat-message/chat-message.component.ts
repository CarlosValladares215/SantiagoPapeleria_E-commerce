// src/app/features/chatbot/components/chat-message/chat-message.component.ts

import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage, ChatProduct, ChatAction } from '../../models/chat.models';

/**
 * ChatMessageComponent - Renders a single chat message.
 * 
 * Supports different message types:
 * - text: Simple text message
 * - products: Product carousel
 * - options: Clickable option chips
 * - order_status: Order information (TODO)
 */
@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="message-container" [class.user-message]="message.sender === 'user'">
      <!-- Bot Avatar -->
      @if (message.sender === 'bot' && !message.isLoading) {
        <div class="avatar">
          <img src="https://res.cloudinary.com/dufklhqtz/image/upload/v1769628496/BOTFinal_kvbfdq.png" alt="Bot">
        </div>
      }

      <!-- Message Content -->
      <div class="bubble" [class.user-bubble]="message.sender === 'user'" [class.bot-bubble]="message.sender === 'bot'">
        
        <!-- Loading Indicator -->
        @if (message.isLoading) {
          <div class="loading-dots">
            <span></span><span></span><span></span>
          </div>
        } @else {
          <!-- Text with formatting -->
          <p class="message-text" [innerHTML]="formatText(message.text)"></p>

          <!-- Product Carousel -->
          @if (message.type === 'products' && products.length) {
            <div class="carousel-wrapper">
              @if (products.length > 2) {
                <button class="carousel-nav carousel-nav-left" (click)="scrollCarousel('left', $event)" type="button">
                  ‹
                </button>
              }
              <div class="product-carousel" #carouselRef>
                @for (product of products; track product._id || product.sku) {
                  <div class="product-card" (click)="productSelected.emit(product)">
                    <div class="product-image">
                      <img [src]="product.multimedia?.principal || 'https://res.cloudinary.com/dufklhqtz/image/upload/v1768924502/placeholder_ni9blz.png'" [alt]="product.nombre">
                    </div>
                    <div class="product-info">
                      <span class="product-brand">{{ product.brand || 'Sin marca' }}</span>
                      <h4 class="product-name">{{ product.nombre }}</h4>
                      <span class="product-price">$ {{ product.price | number:'1.2-2' }}</span>
                    </div>
                  </div>
                }
              </div>
              @if (products.length > 2) {
                <button class="carousel-nav carousel-nav-right" (click)="scrollCarousel('right', $event)" type="button">
                  ›
                </button>
              }
            </div>
          }

          <!-- Options -->
          @if (message.type === 'options' && options.length) {
            <div class="options-container">
              @for (opt of options; track opt) {
                <button class="option-chip" (click)="optionSelected.emit(opt)">
                  {{ opt }}
                </button>
              }
            </div>
          }

          <!-- Actions (with navigation support) -->
          @if (message.type === 'actions' && actions.length) {
            <div class="actions-container">
              @for (action of actions; track action.text) {
                <button class="action-button" 
                        [class.navigate-action]="action.type === 'navigate'"
                        [class.whatsapp-btn]="action.style === 'whatsapp'"
                        (click)="actionSelected.emit(action)">
                  @if (action.icon === 'whatsapp') {
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" class="action-icon">
                  }
                  {{ action.text }}
                </button>
              }
            </div>
          }

          <!-- Timestamp -->
          <div class="timestamp">
            {{ message.timestamp | date:'shortTime' }}
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .message-container {
      display: flex;
      gap: 0.75rem;
      
      &.user-message {
        flex-direction: row-reverse;
      }
    }

    .avatar {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: white;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      flex-shrink: 0;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .bubble {
      max-width: 80%;
      padding: 0.75rem;
      font-size: 0.875rem;
      border-radius: 1rem;
    }

    .user-bubble {
      background: #2563eb;
      color: white;
      border-bottom-right-radius: 0.25rem;
    }

    .bot-bubble {
      background: white;
      color: #1f2937;
      border: 1px solid #f3f4f6;
      border-bottom-left-radius: 0.25rem;
      box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
    }

    .message-text {
      margin: 0;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      
      :host ::ng-deep {
        strong {
          font-weight: 700;
          color: #1e40af;
        }
        
        em {
          font-style: italic;
        }
        
        .chat-divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 0.5rem 0;
        }
        
        .chat-list-item {
          display: block;
          padding-left: 0.5rem;
          margin: 0.25rem 0;
        }
        
        .chat-emoji {
          font-size: 1.1em;
          margin-right: 0.25rem;
        }
      }
    }

    .timestamp {
      font-size: 0.625rem;
      margin-top: 0.25rem;
      text-align: right;
      opacity: 0.7;
    }

    /* Loading dots */
    .loading-dots {
      display: flex;
      gap: 0.25rem;
      padding: 0.5rem 0;
      
      span {
        width: 0.5rem;
        height: 0.5rem;
        background: #9ca3af;
        border-radius: 50%;
        animation: pulse 1.4s infinite both;
        
        &:nth-child(2) { animation-delay: 0.2s; }
        &:nth-child(3) { animation-delay: 0.4s; }
      }
    }

    @keyframes pulse {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }

    /* Product carousel */
    .carousel-wrapper {
      position: relative;
      margin-top: 0.75rem;
    }
    
    .carousel-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      background: white;
      border: 1px solid #e5e7eb;
      color: #374151;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      box-shadow: 0 2px 4px rgb(0 0 0 / 0.1);
      transition: all 0.2s;
      
      &:hover {
        background: #2563eb;
        color: white;
        border-color: #2563eb;
      }
      
      &-left {
        left: -0.5rem;
      }
      
      &-right {
        right: -0.5rem;
      }
    }
    
    .product-carousel {
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      scroll-snap-type: x mandatory;
      scrollbar-width: thin;
      
      &::-webkit-scrollbar {
        height: 4px;
      }
      
      &::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 2px;
      }
      
      &::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 2px;
      }
    }

    .product-card {
      min-width: 140px;
      width: 140px;
      background: #f9fafb;
      border-radius: 0.5rem;
      border: 1px solid #f3f4f6;
      overflow: hidden;
      flex-shrink: 0;
      scroll-snap-align: start;
      cursor: pointer;
      transition: box-shadow 0.2s;
      
      &:hover {
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      }
    }

    .product-image {
      height: 6rem;
      background: white;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .product-info {
      padding: 0.5rem;
    }

    .product-brand {
      font-size: 0.625rem;
      color: #6b7280;
    }

    .product-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0.125rem 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      height: 2rem;
      line-height: 1rem;
    }

    .product-price {
      font-size: 0.75rem;
      font-weight: 700;
      color: #2563eb;
    }

    /* Options */
    .options-container {
      margin-top: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .option-chip {
      padding: 0.375rem 0.75rem;
      background: #eff6ff;
      color: #2563eb;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      border: 1px solid #dbeafe;
      cursor: pointer;
      transition: background-color 0.2s;
      
      &:hover {
        background: #dbeafe;
      }
    }

    /* Actions */
    .actions-container {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .action-button {
      padding: 0.5rem 1rem;
      background: #f0fdf4;
      color: #16a34a;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 500;
      border: 1px solid #bbf7d0;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      
      &:hover {
        background: #dcfce7;
        border-color: #86efac;
      }
      
      &.navigate-action {
        background: #eff6ff;
        color: #2563eb;
        border-color: #bfdbfe;
        
        &:hover {
          background: #dbeafe;
          border-color: #93c5fd;
        }
      }

      &.whatsapp-btn {
        background: #25D366;
        color: white;
        border-color: #128C7E;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;

        &:hover {
          background: #128C7E;
          border-color: #075E54;
        }
      }
    }

    .action-icon {
      width: 1.25rem;
      height: 1.25rem;
    }
  `]
})
export class ChatMessageComponent {
  @Input({ required: true }) message!: ChatMessage;
  @Output() optionSelected = new EventEmitter<string>();
  @Output() productSelected = new EventEmitter<ChatProduct>();
  @Output() actionSelected = new EventEmitter<ChatAction>();
  @ViewChild('carouselRef') carouselRef?: ElementRef<HTMLDivElement>;

  /**
   * Scroll the product carousel left or right
   */
  scrollCarousel(direction: 'left' | 'right', event: Event): void {
    event.stopPropagation();
    if (!this.carouselRef) return;

    const container = this.carouselRef.nativeElement;
    const scrollAmount = 160; // Approximate width of one product card

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  get products(): ChatProduct[] {
    if (this.message.type === 'products' && Array.isArray(this.message.content)) {
      return this.message.content as ChatProduct[];
    }
    return [];
  }

  get options(): string[] {
    if (this.message.type === 'options' && Array.isArray(this.message.content)) {
      return this.message.content as string[];
    }
    return [];
  }

  get actions(): ChatAction[] {
    if (this.message.type === 'actions' && Array.isArray(this.message.content)) {
      return this.message.content as ChatAction[];
    }
    return [];
  }

  /**
   * Format text with markdown-like syntax
   * Supports: **bold**, *italic*, line breaks, lists, horizontal rules
   */
  formatText(text: string): string {
    if (!text) return '';

    let formatted = text
      // Escape HTML first to prevent XSS
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_ (but not inside words)
      .replace(/(?<![\w*])\*(?![*\s])(.+?)(?<![\s*])\*(?![\w*])/g, '<em>$1</em>')
      // Horizontal rule: --- or ===
      .replace(/^-{3,}$/gm, '<hr class="chat-divider">')
      .replace(/^={3,}$/gm, '<hr class="chat-divider">')
      // Bullet lists: lines starting with - or •
      .replace(/^[•\-]\s+(.+)$/gm, '<span class="chat-list-item">• $1</span>')
      // Numbered lists: lines starting with 1. 2. etc
      .replace(/^(\d+)\.\s+(.+)$/gm, '<span class="chat-list-item"><strong>$1.</strong> $2</span>')
      // Checkmarks and emojis at start of lines
      .replace(/^(✅|📦|📋|🔑|📜|💬)/gm, '<span class="chat-emoji">$1</span>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return formatted;
  }
}
