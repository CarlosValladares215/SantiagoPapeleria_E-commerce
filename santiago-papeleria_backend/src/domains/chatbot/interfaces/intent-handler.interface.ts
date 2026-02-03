// src/domains/chatbot/interfaces/intent-handler.interface.ts

import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

/**
 * Interface for intent handlers.
 * Each handler is responsible for processing a specific intent.
 */
export interface IIntentHandler {
    readonly intent: ChatIntent;

    /**
     * Check if this handler can process the given intent
     */
    canHandle(intent: ChatIntent): boolean;

    /**
     * Execute the handler logic and return a response
     */
    execute(
        entities: Record<string, any>,
        userId?: string,
        message?: string
    ): Promise<ChatResponseDto>;
}
