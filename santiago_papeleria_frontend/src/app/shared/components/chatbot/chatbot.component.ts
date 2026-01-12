import { Component, ElementRef, ViewChild, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, MessageCircle, X, Send, Minimize2 } from 'lucide-angular';
import { ChatbotService, ChatMessage } from '../../../core/services/chatbot.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <!-- Floating Button -->
    <div class="fixed bottom-6 right-6 z-50 flex flex-row items-center gap-4">
      
      <!-- Helper Badge -->
      <div *ngIf="!chatbotService.isOpen()" 
           class="bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-bounce cursor-pointer border border-gray-100 flex items-center gap-2"
           (click)="chatbotService.toggleChat()">
        <span>¿Necesitas ayuda?</span>
        <span>👋</span>
      </div>

      <!-- Main Button -->
      <button 
        (click)="chatbotService.toggleChat()"
        class="h-16 w-16 rounded-full bg-white text-blue-600 shadow-xl flex items-center justify-center transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden border-2 border-blue-50">
        <img src="assets/images/bot_avatar.png" alt="Chat" class="w-full h-full object-cover">
      </button>
    </div>

    <!-- Chat Window -->
    <div *ngIf="chatbotService.isOpen()"
         class="fixed bottom-6 right-24 mr-4 w-96 max-w-[calc(100vw-8rem)] h-[500px] max-h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200 animate-fade-in-up">
      
      <!-- Header -->
      <div class="bg-blue-600 p-4 flex justify-between items-center text-white">
        <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-white border border-blue-400 overflow-hidden flex items-center justify-center">
                <img src="assets/images/bot_avatar.png" alt="Bot" class="w-full h-full object-cover">
            </div>
            <div>
                <h3 class="font-bold text-sm">Asistente Santiago</h3>
                <span class="text-xs text-blue-100 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> En línea
                </span>
            </div>
        </div>
        <button (click)="chatbotService.toggleChat()" class="text-white/80 hover:text-white transition-colors">
            <lucide-icon [name]="'minimize-2'" [size]="18"></lucide-icon>
        </button>
      </div>

      <!-- Messages Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth" #scrollContainer>
        <div *ngFor="let msg of chatbotService.messages()" 
             [ngClass]="{'flex-row-reverse': msg.sender === 'user'}"
             class="flex gap-3">
          
          <!-- Avatar -->
          <div *ngIf="msg.sender === 'bot'" class="w-8 h-8 rounded-full bg-white border border-gray-200 overflow-hidden flex flex-center flex-shrink-0">
             <img src="assets/images/bot_avatar.png" alt="Bot" class="w-full h-full object-cover">
          </div>

          <!-- Message Bubble -->
          <div [ngClass]="{
            'bg-blue-600 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl': msg.sender === 'user',
            'bg-white text-gray-800 border border-gray-100 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl shadow-sm': msg.sender === 'bot'
          }" class="max-w-[80%] p-3 text-sm">
            
            <p>{{ msg.text }}</p>

            <!-- Product Carousel -->
            <div *ngIf="msg.type === 'products' && msg.content?.length" class="mt-3 flex gap-3 overflow-x-auto pb-2 snap-x">
                <div *ngFor="let product of msg.content" (click)="navigateToProduct(product)" class="min-w-[140px] w-[140px] bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden flex-shrink-0 snap-start cursor-pointer hover:shadow-md transition-shadow">
                    <div class="h-24 w-full bg-gray-100 relative">
                        <img [src]="product.multimedia?.principal" class="w-full h-full object-cover">
                    </div>
                    <div class="p-2">
                        <p class="text-[10px] text-gray-500 truncate">{{product.brand}}</p>
                        <h4 class="text-xs font-semibold text-gray-800 line-clamp-2 h-8 leading-4">{{product.nombre}}</h4>
                        <div class="mt-1 flex justify-between items-center">
                            <span class="text-xs font-bold text-blue-600">$ {{ product.price | number: '1.2-2'}}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Options Chips -->
            <div *ngIf="msg.type === 'options' && msg.content?.length" class="mt-3 flex flex-wrap gap-2">
                <button *ngFor="let opt of msg.content" 
                        (click)="sendMessage(opt)"
                        class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors border border-blue-100">
                    {{opt}}
                </button>
            </div>

            <!-- Metadata/Time -->
             <div [ngClass]="msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'" class="text-[10px] mt-1 text-right">
                {{ msg.timestamp | date:'shortTime' }}
             </div>

          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-4 bg-white border-t border-gray-100">
        <form (submit)="sendMessage()" class="flex gap-2">
          <input 
            type="text" 
            [(ngModel)]="newMessage" 
            name="message"
            placeholder="Escribe tu mensaje..."
            class="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            autocomplete="off">
          <button 
            type="submit"
            [disabled]="!newMessage.trim()"
            class="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
            <lucide-icon [name]="'send'" [size]="18"></lucide-icon>
          </button>
        </form>
      </div>

    </div>
  `,
  styles: [`
    .animate-bounce {
        animation: bounce 2s infinite;
    }
    @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
    }
    .animate-fade-in-up {
        animation: fadeInUp 0.3s ease-out;
    }
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ChatbotComponent implements AfterViewChecked {
  newMessage = '';
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor(public chatbotService: ChatbotService, private router: Router) {
    effect(() => {
      // Auto scroll when messages change
      const msgs = this.chatbotService.messages();
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  ngAfterViewChecked() {
    // this.scrollToBottom();
  }

  scrollToBottom(): void {
    if (this.scrollContainer) {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      } catch (err) { }
    }
  }

  navigateToProduct(product: any) {
    if (product.sku) {
      this.router.navigate(['/product', product.sku]);
    } else if (product.slug) {
      this.router.navigate(['/product', product.slug]);
    } else if (product._id) {
      this.router.navigate(['/product', product._id]);
    }
  }

  sendMessage(text?: string) {
    const messageToSend = text || this.newMessage;
    if (messageToSend.trim()) {
      this.chatbotService.sendMessage(messageToSend);
      this.newMessage = '';
    }
  }
}
