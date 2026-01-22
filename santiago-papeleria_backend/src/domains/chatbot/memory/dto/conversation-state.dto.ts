// src/domains/chatbot/memory/dto/conversation-state.dto.ts

/**
 * Structured conversation state stored in memory.
 * Used to maintain context between messages.
 */
export interface ConversationState {
    /** Last detected intent */
    lastIntent: string | null;

    /** Active search/filter parameters */
    filters: {
        searchTerm?: string;
        category?: string;
        brand?: string;
        minPrice?: number;
        maxPrice?: number;
        color?: string;
    };

    /** Current step in conversation flow */
    step: 'idle' | 'showing_results' | 'showing_details' | 'awaiting_confirmation';

    /** SKUs of last products shown (for resolving "el primero", etc.) */
    lastProductsShown: string[];

    /** Pending action awaiting confirmation */
    pendingAction: string | null;

    /** Last activity timestamp */
    lastActivityAt: number;
}

/**
 * Message in short-term context
 */
export interface ContextMessage {
    role: 'user' | 'bot';
    text: string;
    intent?: string;
    timestamp: number;
}

/**
 * Short-term context stored in memory
 */
export interface ConversationContext {
    messages: ContextMessage[];
    lastMessageAt: number;
}

/**
 * Create empty initial state
 */
export function createEmptyState(): ConversationState {
    return {
        lastIntent: null,
        filters: {},
        step: 'idle',
        lastProductsShown: [],
        pendingAction: null,
        lastActivityAt: Date.now(),
    };
}

/**
 * Create empty context
 */
export function createEmptyContext(): ConversationContext {
    return {
        messages: [],
        lastMessageAt: Date.now(),
    };
}
