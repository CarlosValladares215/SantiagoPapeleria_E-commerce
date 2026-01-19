// src/domains/chatbot/nlp/adapters/mock-llm.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { ILlmAdapter, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ChatIntent } from '../../enums/chat-intent.enum';

/**
 * Mock LLM adapter for testing and development.
 * Returns predefined responses based on keyword matching.
 */
@Injectable()
export class MockLlmAdapter implements ILlmAdapter {
    private readonly logger = new Logger(MockLlmAdapter.name);

    // Product keywords for entity extraction
    private readonly PRODUCT_KEYWORDS = [
        'mochila', 'mochilas', 'cuaderno', 'cuadernos', 'lapiz', 'lápiz', 'lapices', 'lápices',
        'papel', 'carpeta', 'carpetas', 'bolígrafo', 'boligrafo', 'calculadora', 'calculadoras',
        'regla', 'reglas', 'borrador', 'borradores', 'tijera', 'tijeras', 'pegamento',
        'marcador', 'marcadores', 'folder', 'folders', 'agenda', 'agendas', 'estuche',
        'pluma', 'plumas', 'crayola', 'crayolas', 'tempera', 'temperas', 'pintura',
        'colores', 'color', 'plastilina', 'goma', 'sacapuntas', 'resaltador',
    ];

    // Trigger words to remove when extracting search term
    private readonly TRIGGER_WORDS = [
        'buscar', 'busca', 'busco', 'buscame', 'búscame', 'buscando',
        'tienes', 'tienen', 'tendrán', 'tendran',
        'quiero', 'quisiera', 'queria', 'querría',
        'necesito', 'necesitaria', 'venden', 'hay', 'dame', 'deme',
        'mostrar', 'muestra', 'ver', 'muéstrame', 'muestrame', 'encontrar',
        'podrias', 'podrías', 'puedes', 'puede', 'ayudame', 'ayúdame',
        'productos', 'producto', 'artículos', 'articulos', 'cosas',
        'una', 'uno', 'unos', 'unas', 'el', 'la', 'los', 'las', 'de', 'en', 'con', 'para',
        'me', 'te', 'yo', 'que', 'por', 'favor', 'ayudes', 'ayudar',
    ];

    getName(): string {
        return 'mock';
    }

    async complete(prompt: string): Promise<LlmResponse> {
        const start = Date.now();

        // Simulate some latency
        await new Promise(resolve => setTimeout(resolve, 50));

        // Extract user message from prompt
        const userMessageMatch = prompt.match(/MENSAJE DEL USUARIO:\s*(.+)$/s);
        const userMessage = userMessageMatch ? userMessageMatch[1].trim().toLowerCase() : prompt.toLowerCase();

        this.logger.debug(`Processing message: "${userMessage}"`);

        // Check if it's a "Buscar productos" button click (ask for clarification)
        if (this.isSearchButtonWithoutTerm(userMessage)) {
            this.logger.debug('Detected: search button without term -> asking for clarification');
            return this.buildResponse(ChatIntent.UNCLEAR, 0.9, { needsProductClarification: true }, userMessage, start);
        }

        // Check if it's other button text that should go to general help
        if (this.isGeneralButtonText(userMessage)) {
            this.logger.debug('Detected: general button text -> general help');
            return this.buildResponse(ChatIntent.GENERAL_HELP, 0.9, {}, userMessage, start);
        }

        // Intent detection - order matters!
        let intent = ChatIntent.UNCLEAR;
        let confidence = 0.5;
        const entities: Record<string, any> = {};

        // 1. Human escalation (highest priority)
        if (this.matchesKeywords(userMessage, ['humano', 'agente', 'persona real', 'soporte humano', 'hablar con alguien'])) {
            intent = ChatIntent.HUMAN_ESCALATION;
            confidence = 0.95;
        }
        // 2. Greeting (only if it's clearly a greeting)
        else if (this.isGreeting(userMessage)) {
            intent = ChatIntent.GREETING;
            confidence = 0.92;
        }
        // 3. Order status
        else if (this.matchesKeywords(userMessage, ['pedido', 'orden', 'tracking', 'estado de mi', 'envío', 'mi compra', 'mi orden'])) {
            intent = ChatIntent.ORDER_STATUS;
            confidence = 0.9;
        }
        // 4. Pricing info
        else if (this.matchesKeywords(userMessage, ['precio', 'cuesta', 'mayorista', 'pvp', 'pvm', 'cuánto vale', 'cuanto cuesta'])) {
            intent = ChatIntent.PRICING_INFO;
            confidence = 0.88;
        }
        // 5. General help
        else if (this.matchesKeywords(userMessage, ['ayuda', 'help', 'qué puedes', 'cómo funciona', 'que haces', 'opciones'])) {
            intent = ChatIntent.GENERAL_HELP;
            confidence = 0.87;
        }
        // 6. Product search
        else if (this.looksLikeProductSearch(userMessage)) {
            const searchTerm = this.extractSearchTerm(userMessage);
            this.logger.debug(`Extracted search term: "${searchTerm}"`);

            if (searchTerm && searchTerm.length > 2) {
                intent = ChatIntent.PRODUCT_SEARCH;
                confidence = 0.85;
                entities.searchTerm = searchTerm;
            } else {
                // Has search intent but no clear term - ask for clarification
                intent = ChatIntent.UNCLEAR;
                confidence = 0.7;
                entities.needsProductClarification = true;
            }
        }

        this.logger.debug(`Final intent: ${intent}, confidence: ${confidence}, entities: ${JSON.stringify(entities)}`);
        return this.buildResponse(intent, confidence, entities, userMessage, start);
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }

    private buildResponse(intent: ChatIntent, confidence: number, entities: Record<string, any>, userMessage: string, startTime: number): LlmResponse {
        const response = {
            intent,
            confidence,
            entities,
            originalText: userMessage,
        };

        return {
            raw: JSON.stringify(response),
            parsed: response,
            latencyMs: Date.now() - startTime,
        };
    }

    /**
     * Check if it's a "Buscar productos" type button (needs clarification)
     */
    private isSearchButtonWithoutTerm(text: string): boolean {
        const normalized = text.replace(/\s+/g, ' ').trim();
        const searchButtons = ['buscar productos', 'buscar otra cosa', 'ver productos'];
        return searchButtons.includes(normalized);
    }

    /**
     * Check if it's a general navigation button
     */
    private isGeneralButtonText(text: string): boolean {
        const normalized = text.replace(/\s+/g, ' ').trim();
        const generalButtons = ['ver todos los productos', 'ver ofertas', 'intentar de nuevo', 'volver al menú'];
        return generalButtons.includes(normalized);
    }

    private isGreeting(text: string): boolean {
        const greetings = ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'saludos'];
        const words = text.split(/\s+/);
        // Only match if it's a short message that's primarily a greeting
        return words.length <= 3 && greetings.some(g => text.startsWith(g) || text === g);
    }

    private matchesKeywords(text: string, keywords: string[]): boolean {
        return keywords.some(keyword => text.includes(keyword));
    }

    private hasProductKeyword(text: string): boolean {
        return this.PRODUCT_KEYWORDS.some(keyword => text.includes(keyword));
    }

    /**
     * Detect if message looks like a product search
     */
    private looksLikeProductSearch(text: string): boolean {
        // Has a known product keyword
        if (this.hasProductKeyword(text)) return true;

        // Has search-related trigger words
        const searchTriggers = ['buscar', 'busca', 'busco', 'buscame', 'buscando', 'quiero', 'quisiera', 'necesito', 'dame', 'muestra'];
        return searchTriggers.some(t => text.includes(t));
    }

    /**
     * Extract the actual product search term from the message
     */
    private extractSearchTerm(text: string): string {
        // First, check if there's a known product keyword in the text
        for (const keyword of this.PRODUCT_KEYWORDS) {
            if (text.includes(keyword)) {
                this.logger.debug(`Found product keyword: ${keyword}`);
                return keyword;
            }
        }

        // Otherwise, clean up the message to extract the search term
        let cleaned = text;

        // Remove trigger words
        for (const trigger of this.TRIGGER_WORDS) {
            const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
            cleaned = cleaned.replace(regex, '');
        }

        // Remove extra spaces and punctuation
        cleaned = cleaned.replace(/[¿?¡!,.]/g, '').replace(/\s+/g, ' ').trim();

        return cleaned;
    }
}
