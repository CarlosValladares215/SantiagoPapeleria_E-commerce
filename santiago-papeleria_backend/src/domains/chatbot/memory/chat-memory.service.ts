// src/domains/chatbot/memory/chat-memory.service.ts

import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IMemoryStore } from './interfaces/memory-store.interface';
import { MEMORY_STORE_TOKEN } from './interfaces/memory-store.interface';
import {
    ConversationState,
    ConversationContext,
    createEmptyState,
} from './dto/conversation-state.dto';

/**
 * ChatMemoryService - Manages conversation memory and state.
 * 
 * Responsibilities:
 * - Get/set conversation state
 * - Manage short-term message context
 * - Resolve references ("ese", "el primero")
 * - Update filters and flow state
 */
@Injectable()
export class ChatMemoryService {
    private readonly logger = new Logger(ChatMemoryService.name);

    constructor(
        @Inject(MEMORY_STORE_TOKEN)
        private readonly store: IMemoryStore,
    ) { }

    /**
     * Get or create conversation state
     */
    async getState(sessionId: string): Promise<ConversationState> {
        const state = await this.store.getState(sessionId);
        if (!state) {
            this.logger.debug(`No state found for session ${sessionId}, creating new`);
            return createEmptyState();
        }
        return state;
    }

    /**
     * Save conversation state
     */
    async saveState(sessionId: string, state: ConversationState): Promise<void> {
        await this.store.setState(sessionId, state);
    }

    /**
     * Update specific state fields (partial update)
     */
    async updateState(sessionId: string, updates: Partial<ConversationState>): Promise<ConversationState> {
        const current = await this.getState(sessionId);
        const updated = { ...current, ...updates, lastActivityAt: Date.now() };
        await this.saveState(sessionId, updated);
        return updated;
    }

    /**
     * Get message context for the session
     */
    async getContext(sessionId: string): Promise<ConversationContext | null> {
        return this.store.getContext(sessionId);
    }

    /**
     * Add a message to the context
     */
    async addMessage(sessionId: string, role: 'user' | 'bot', text: string, intent?: string): Promise<void> {
        await this.store.addMessage(sessionId, role, text, intent);
    }

    /**
     * Resolve positional references like "el primero", "el segundo"
     * Returns the SKU if found, null otherwise
     */
    async resolveProductReference(sessionId: string, reference: string): Promise<string | null> {
        const state = await this.getState(sessionId);
        const products = state.lastProductsShown;

        if (!products || products.length === 0) {
            return null;
        }

        const lowerRef = reference.toLowerCase();

        // Map Spanish ordinals to indices
        const ordinals: Record<string, number> = {
            'primero': 0, 'primer': 0, 'el primero': 0, '1ro': 0, '1': 0,
            'segundo': 1, 'el segundo': 1, '2do': 1, '2': 1,
            'tercero': 2, 'tercer': 2, 'el tercero': 2, '3ro': 2, '3': 2,
            'cuarto': 3, 'el cuarto': 3, '4to': 3, '4': 3,
            'último': products.length - 1, 'el último': products.length - 1,
        };

        for (const [key, index] of Object.entries(ordinals)) {
            if (lowerRef.includes(key) && index < products.length) {
                return products[index];
            }
        }

        return null;
    }

    /**
     * Update filters from entities
     */
    async updateFiltersFromEntities(
        sessionId: string,
        entities: Record<string, any>
    ): Promise<ConversationState> {
        const state = await this.getState(sessionId);

        // Merge new entities into existing filters
        const newFilters = { ...state.filters };

        if (entities.searchTerm) newFilters.searchTerm = entities.searchTerm;
        if (entities.category) newFilters.category = entities.category;
        if (entities.brand) newFilters.brand = entities.brand;
        if (entities.minPrice !== undefined) newFilters.minPrice = entities.minPrice;
        if (entities.maxPrice !== undefined) newFilters.maxPrice = entities.maxPrice;
        if (entities.color) newFilters.color = entities.color;

        state.filters = newFilters;
        await this.saveState(sessionId, state);

        return state;
    }

    /**
     * Store shown products for reference resolution
     */
    async setLastProductsShown(sessionId: string, skus: string[]): Promise<void> {
        await this.updateState(sessionId, {
            lastProductsShown: skus,
            step: 'showing_results',
        });
    }

    /**
     * Clear session (logout, explicit reset)
     */
    async clearSession(sessionId: string): Promise<void> {
        await this.store.clearSession(sessionId);
        this.logger.debug(`Session ${sessionId} cleared`);
    }
}
