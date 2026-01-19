// src/app/features/chatbot/services/chat-state.service.ts

import { Injectable, inject, signal, computed } from '@angular/core';
import { ChatApiService } from './chat-api.service';
import { ChatSessionService } from './chat-session.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ChatMessage, ChatResponse, ChatMessageType } from '../models/chat.models';

/**
 * ChatStateService - Central state management for the chatbot.
 * 
 * Responsibilities:
 * - Manage messages array (signal-based)
 * - Coordinate API calls and session
 * - Handle loading states
 * - Expose computed signals for UI
 * 
 * This is the ONLY service the UI components should interact with.
 */
@Injectable({
    providedIn: 'root'
})
export class ChatStateService {
    private readonly api = inject(ChatApiService);
    private readonly session = inject(ChatSessionService);
    private readonly auth = inject(AuthService);

    // Private state
    private readonly _messages = signal<ChatMessage[]>([]);
    private readonly _isOpen = signal(false);
    private readonly _isLoading = signal(false);
    private readonly _isHealthy = signal(true);

    // Public read-only signals
    readonly messages = this._messages.asReadonly();
    readonly isOpen = this._isOpen.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly isHealthy = this._isHealthy.asReadonly();

    // Computed signals
    readonly hasMessages = computed(() => this._messages().length > 0);
    readonly lastMessage = computed(() => {
        const msgs = this._messages();
        return msgs.length > 0 ? msgs[msgs.length - 1] : null;
    });

    constructor() {
        this.initializeChat();
    }

    /**
     * Initialize chat with welcome message
     */
    private initializeChat(): void {
        // Simple text welcome - quick suggestion cards are shown separately in the UI
        this.addBotMessage(
            '¡Hola! Soy el asistente virtual de Santiago Papelería. ¿En qué puedo ayudarte hoy?',
            'text'
        );

        // Check backend health on init
        this.api.checkHealth().subscribe(health => {
            this._isHealthy.set(health?.healthy ?? false);
        });
    }

    /**
     * Toggle chat window visibility
     */
    toggleChat(): void {
        this._isOpen.update(v => !v);
    }

    /**
     * Open chat window
     */
    openChat(): void {
        this._isOpen.set(true);
    }

    /**
     * Close chat window
     */
    closeChat(): void {
        this._isOpen.set(false);
    }

    /**
     * Send a message to the backend
     */
    sendMessage(text: string): void {
        if (!text.trim() || this._isLoading()) return;

        // Add user message immediately
        this.addUserMessage(text);

        // Show loading indicator
        this._isLoading.set(true);
        const loadingId = this.addLoadingMessage();

        // Build request
        const user = this.auth.user();
        const request = {
            message: text,
            sessionId: this.session.getSessionId(),
            userId: user?._id
        };

        // Send to API
        this.api.sendMessage(request).subscribe({
            next: (response) => {
                this.removeMessage(loadingId);
                this.addBotMessage(response.text, response.type, response.content);
                this._isLoading.set(false);
            },
            error: () => {
                this.removeMessage(loadingId);
                this.addBotMessage(
                    'Lo siento, hubo un error. Por favor intenta de nuevo.',
                    'options',
                    ['Intentar de nuevo', 'Hablar con un agente']
                );
                this._isLoading.set(false);
            }
        });
    }

    /**
     * Clear chat and start fresh
     */
    resetChat(): void {
        this.session.resetSession();
        this._messages.set([]);
        this.initializeChat();
    }

    /**
     * Add a user message to the chat
     */
    private addUserMessage(text: string): void {
        const message: ChatMessage = {
            id: this.generateId(),
            text,
            sender: 'user',
            timestamp: new Date(),
            type: 'text'
        };
        this._messages.update(msgs => [...msgs, message]);
    }

    /**
     * Add a bot message to the chat
     */
    private addBotMessage(text: string, type: ChatMessageType = 'text', content?: unknown): void {
        const message: ChatMessage = {
            id: this.generateId(),
            text,
            sender: 'bot',
            timestamp: new Date(),
            type,
            content
        };
        this._messages.update(msgs => [...msgs, message]);
    }

    /**
     * Add loading indicator message
     */
    private addLoadingMessage(): string {
        const id = this.generateId();
        const message: ChatMessage = {
            id,
            text: '',
            sender: 'bot',
            timestamp: new Date(),
            type: 'text',
            isLoading: true
        };
        this._messages.update(msgs => [...msgs, message]);
        return id;
    }

    /**
     * Remove a message by ID
     */
    private removeMessage(id: string): void {
        this._messages.update(msgs => msgs.filter(m => m.id !== id));
    }

    /**
     * Generate a unique message ID
     */
    private generateId(): string {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
