// src/domains/chatbot/handlers/base.handler.ts

import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { IIntentHandler } from '../interfaces/intent-handler.interface';

/**
 * Base class for intent handlers.
 * Provides common functionality and enforces the handler pattern.
 */
export abstract class BaseHandler implements IIntentHandler {
    abstract readonly intent: ChatIntent;

    canHandle(intent: ChatIntent): boolean {
        return intent === this.intent;
    }

    abstract execute(
        entities: Record<string, any>,
        userId?: string
    ): Promise<ChatResponseDto>;
}
