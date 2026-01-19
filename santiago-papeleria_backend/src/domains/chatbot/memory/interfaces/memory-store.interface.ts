// src/domains/chatbot/memory/interfaces/memory-store.interface.ts

import { ConversationState, ConversationContext } from '../dto/conversation-state.dto';

/**
 * Abstract interface for memory storage.
 * Allows swapping between in-memory (dev) and Redis (production).
 */
export interface IMemoryStore {
    /**
     * Get conversation state for a session
     */
    getState(sessionId: string): Promise<ConversationState | null>;

    /**
     * Save conversation state
     */
    setState(sessionId: string, state: ConversationState): Promise<void>;

    /**
     * Get conversation context (recent messages)
     */
    getContext(sessionId: string): Promise<ConversationContext | null>;

    /**
     * Add message to context
     */
    addMessage(sessionId: string, role: 'user' | 'bot', text: string, intent?: string): Promise<void>;

    /**
     * Clear session (for testing or logout)
     */
    clearSession(sessionId: string): Promise<void>;
}

export const MEMORY_STORE_TOKEN = 'IMemoryStore';
