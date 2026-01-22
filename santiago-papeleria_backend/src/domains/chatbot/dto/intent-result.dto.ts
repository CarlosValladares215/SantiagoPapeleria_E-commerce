// src/domains/chatbot/dto/intent-result.dto.ts

import { ChatIntent } from '../enums/chat-intent.enum';

export class IntentResultDto {
    intent: ChatIntent;
    confidence: number;
    entities: Record<string, any>;
    originalText: string;
}

export interface RawLlmIntentResult {
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    originalText: string;
}
