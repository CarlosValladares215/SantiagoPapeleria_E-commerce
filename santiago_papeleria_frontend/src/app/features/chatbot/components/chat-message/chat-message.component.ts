// src/app/features/chatbot/components/chat-message/chat-message.component.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
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
          <img src="https://res.cloudinary.com/dufklhqtz/image/upload/v1768923352/bot_avatar_h4ftod.jpg" alt="Bot">
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
          <!-- Text -->
          <p class="message-text">{{ message.text }}</p>

          <!-- Product Carousel -->
          @if (message.type === 'products' && products.length) {
            <div class="product-carousel">
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
                        (click)="actionSelected.emit(action)">
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
    .product-carousel {
      margin-top: 0.75rem;
      display: flex;
      gap: 0.75rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      scroll-snap-type: x mandatory;
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
    }
  `]
})
export class ChatMessageComponent {
  @Input({ required: true }) message!: ChatMessage;
  @Output() optionSelected = new EventEmitter<string>();
  @Output() productSelected = new EventEmitter<ChatProduct>();
  @Output() actionSelected = new EventEmitter<ChatAction>();

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
}
