// src/app/features/chatbot/models/chat.models.ts

/**
 * Chat message types supported by the backend
 */
export type ChatMessageType = 'text' | 'products' | 'order_status' | 'options' | 'actions';

/**
 * Action button with optional navigation
 */
export interface ChatAction {
    text: string;
    url?: string;      // If provided, frontend navigates to this URL
    type?: 'navigate' | 'message';  // 'navigate' opens URL, 'message' sends as chat
}

/**
 * Role of the message sender
 */
export type ChatRole = 'user' | 'bot';

/**
 * A single chat message in the conversation
 */
export interface ChatMessage {
    id: string;
    text: string;
    sender: ChatRole;
    timestamp: Date;
    type: ChatMessageType;
    content?: unknown;
    isLoading?: boolean;
}

/**
 * Backend response structure
 */
export interface ChatResponse {
    text: string;
    type: ChatMessageType;
    content?: unknown;
    suggestedActions?: string[];
}

/**
 * Request payload to backend
 */
export interface ChatRequest {
    message: string;
    sessionId: string;
    userId?: string;
}

/**
 * Product data from backend for display
 */
export interface ChatProduct {
    _id?: string;
    sku?: string;
    slug?: string;
    codigo_dobranet?: string;
    nombre: string;
    brand?: string;
    price: number;
    multimedia?: {
        principal?: string;
    };
}

/**
 * Health check response
 */
export interface ChatHealthResponse {
    healthy: boolean;
    nlp: {
        healthy: boolean;
        adapter: string;
        fallbackAvailable: boolean;
    };
}
