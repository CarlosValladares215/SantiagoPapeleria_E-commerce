// src/app/features/chatbot/components/chat-widget/chat-widget.component.ts

import {
    Component,
    inject,
    ElementRef,
    ViewChild,
    effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ChatStateService } from '../../services/chat-state.service';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ChatProduct, ChatAction } from '../../models/chat.models';

/**
 * ChatWidgetComponent - Main entry point for the chatbot UI.
 * 
 * Responsibilities:
 * - Render floating button and chat window
 * - Handle user input
 * - Delegate all state to ChatStateService
 * - Auto-scroll on new messages
 */
@Component({
    selector: 'app-chat-widget',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        LucideAngularModule,
        ChatMessageComponent
    ],
    templateUrl: './chat-widget.component.html',
    styleUrl: './chat-widget.component.scss'
})
export class ChatWidgetComponent {
    protected readonly state = inject(ChatStateService);
    private readonly router = inject(Router);

    @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

    inputText = '';

    constructor() {
        // Auto-scroll when messages change
        // Auto-scroll when messages change or chat opens
        effect(() => {
            const _msgs = this.state.messages();
            const _open = this.state.isOpen();
            setTimeout(() => this.scrollToBottom(), 50);
        });
    }

    /**
     * Handle form submission
     */
    handleSend(event: Event): void {
        event.preventDefault();
        if (this.inputText.trim()) {
            this.state.sendMessage(this.inputText);
            this.inputText = '';
        }
    }

    /**
     * Handle quick option click
     */
    handleOptionClick(option: string): void {
        this.state.sendMessage(option);
    }

    /**
     * Handle product click - navigate to product page or return URL
     */
    handleProductClick(product: ChatProduct): void {
        // Check if product has a return URL (for return product carousel)
        if ((product as any).returnUrl) {
            const returnUrl = (product as any).returnUrl;
            const [path, queryString] = returnUrl.split('?');
            const queryParams: Record<string, string> = {};

            if (queryString) {
                queryString.split('&').forEach((param: string) => {
                    const [key, value] = param.split('=');
                    if (key) queryParams[key] = value || '';
                });
            }

            this.router.navigate([path], { queryParams });
            this.state.closeChat();
            return;
        }

        // Default: navigate to product detail
        const identifier = product.slug || product.sku || product._id;
        if (identifier) {
            this.router.navigate(['/product', identifier]);
            this.state.closeChat();
        }
    }

    /**
     * Scroll to bottom of messages
     */
    private scrollToBottom(): void {
        if (this.scrollContainer) {
            try {
                const el = this.scrollContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            } catch { /* Ignore scroll errors */ }
        }
    }

    /**
     * Handle action button click - navigate or send as message
     */
    handleActionClick(action: ChatAction): void {
        if (action.type === 'navigate' && action.url) {
            // Check for external URL
            if (action.external || action.url.startsWith('http')) {
                window.open(action.url, '_blank');
                return;
            }

            // Parse URL and query params separately
            const [path, queryString] = action.url.split('?');
            const queryParams: Record<string, string> = {};

            if (queryString) {
                queryString.split('&').forEach(param => {
                    const [key, value] = param.split('=');
                    if (key) queryParams[key] = value || '';
                });
            }

            this.router.navigate([path], { queryParams });
            this.state.closeChat();
        } else {
            // Send as message
            this.state.sendMessage(action.text);
        }
    }

    /**
     * Handle reset chat button - clear history and start fresh
     */
    handleResetChat(): void {
        this.state.resetChat();
    }

    /**
     * Handle quick suggestion card click
     */
    handleSuggestionClick(suggestion: string): void {
        this.state.sendMessage(suggestion);
    }
}
