// src/domains/chatbot/memory/stores/in-memory.store.ts

import { Injectable, Logger } from '@nestjs/common';
import { IMemoryStore } from '../interfaces/memory-store.interface';
import {
    ConversationState,
    ConversationContext,
    ContextMessage,
    createEmptyState,
    createEmptyContext,
} from '../dto/conversation-state.dto';

interface MemoryEntry<T> {
    data: T;
    expiresAt: number;
}

/**
 * In-memory store implementation.
 * Uses Map with TTL for development and fallback.
 * Can be replaced with Redis in production.
 */
@Injectable()
export class InMemoryStore implements IMemoryStore {
    private readonly logger = new Logger(InMemoryStore.name);

    private readonly states = new Map<string, MemoryEntry<ConversationState>>();
    private readonly contexts = new Map<string, MemoryEntry<ConversationContext>>();

    // TTLs in milliseconds
    private readonly STATE_TTL = 30 * 60 * 1000;   // 30 minutes
    private readonly CONTEXT_TTL = 30 * 60 * 1000; // 30 minutes (same as state)
    private readonly MAX_CONTEXT_MESSAGES = 10;

    // Cleanup interval
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Run cleanup every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        this.logger.log('InMemoryStore initialized');
    }

    async getState(sessionId: string): Promise<ConversationState | null> {
        const entry = this.states.get(sessionId);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.states.delete(sessionId);
            return null;
        }

        return entry.data;
    }

    async setState(sessionId: string, state: ConversationState): Promise<void> {
        state.lastActivityAt = Date.now();
        this.states.set(sessionId, {
            data: state,
            expiresAt: Date.now() + this.STATE_TTL,
        });
    }

    async getContext(sessionId: string): Promise<ConversationContext | null> {
        const entry = this.contexts.get(sessionId);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.contexts.delete(sessionId);
            return null;
        }

        return entry.data;
    }

    async addMessage(sessionId: string, role: 'user' | 'bot', text: string, intent?: string): Promise<void> {
        let context = await this.getContext(sessionId);
        if (!context) {
            context = createEmptyContext();
        }

        const message: ContextMessage = {
            role,
            text,
            intent,
            timestamp: Date.now(),
        };

        context.messages.push(message);

        // Keep only last N messages
        if (context.messages.length > this.MAX_CONTEXT_MESSAGES) {
            context.messages = context.messages.slice(-this.MAX_CONTEXT_MESSAGES);
        }

        context.lastMessageAt = Date.now();

        this.contexts.set(sessionId, {
            data: context,
            expiresAt: Date.now() + this.CONTEXT_TTL,
        });
    }

    async clearSession(sessionId: string): Promise<void> {
        this.states.delete(sessionId);
        this.contexts.delete(sessionId);
    }

    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.states) {
            if (now > entry.expiresAt) {
                this.states.delete(key);
                cleaned++;
            }
        }

        for (const [key, entry] of this.contexts) {
            if (now > entry.expiresAt) {
                this.contexts.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.debug(`Cleaned up ${cleaned} expired entries`);
        }
    }

    // For testing
    getStats(): { states: number; contexts: number } {
        return {
            states: this.states.size,
            contexts: this.contexts.size,
        };
    }
}
