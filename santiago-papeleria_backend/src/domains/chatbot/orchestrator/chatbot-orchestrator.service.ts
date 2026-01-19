// src/domains/chatbot/orchestrator/chatbot-orchestrator.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { NlpService } from '../nlp/nlp.service';
import { ChatMemoryService } from '../memory/chat-memory.service';
import { ChatMessageDto } from '../dto/chat-message.dto';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { ChatIntent } from '../enums/chat-intent.enum';
import { IIntentHandler } from '../interfaces/intent-handler.interface';

// Import handlers
import { ProductSearchHandler } from '../handlers/product-search.handler';
import { OrderStatusHandler } from '../handlers/order-status.handler';
import { PricingInfoHandler } from '../handlers/pricing-info.handler';
import { HumanEscalationHandler } from '../handlers/human-escalation.handler';
import { GeneralHelpHandler } from '../handlers/general-help.handler';
import { GreetingHandler } from '../handlers/greeting.handler';
import { OutOfScopeHandler } from '../handlers/out-of-scope.handler';
import { UnclearHandler } from '../handlers/unclear.handler';
import { GratitudeHandler } from '../handlers/gratitude.handler';
import { ViewOffersHandler } from '../handlers/view-offers.handler';
import { NavigationHelpHandler } from '../handlers/navigation-help.handler';
import { ReturnsHandler } from '../handlers/returns.handler';

@Injectable()
export class ChatbotOrchestrator {
    private readonly logger = new Logger(ChatbotOrchestrator.name);
    private readonly handlers: Map<ChatIntent, IIntentHandler>;
    constructor(
        private readonly nlpService: NlpService,
        private readonly memoryService: ChatMemoryService,
        private readonly productSearchHandler: ProductSearchHandler,
        private readonly orderStatusHandler: OrderStatusHandler,
        private readonly pricingInfoHandler: PricingInfoHandler,
        private readonly humanEscalationHandler: HumanEscalationHandler,
        private readonly generalHelpHandler: GeneralHelpHandler,
        private readonly greetingHandler: GreetingHandler,
        private readonly outOfScopeHandler: OutOfScopeHandler,
        private readonly unclearHandler: UnclearHandler,
        private readonly gratitudeHandler: GratitudeHandler,
        private readonly viewOffersHandler: ViewOffersHandler,
        private readonly navigationHelpHandler: NavigationHelpHandler,
        private readonly returnsHandler: ReturnsHandler,
    ) {
        // Register handlers
        this.handlers = new Map<ChatIntent, IIntentHandler>();
        this.handlers.set(ChatIntent.PRODUCT_SEARCH, productSearchHandler);
        this.handlers.set(ChatIntent.ORDER_STATUS, orderStatusHandler);
        this.handlers.set(ChatIntent.PRICING_INFO, pricingInfoHandler);
        this.handlers.set(ChatIntent.HUMAN_ESCALATION, humanEscalationHandler);
        this.handlers.set(ChatIntent.GENERAL_HELP, generalHelpHandler);
        this.handlers.set(ChatIntent.GREETING, greetingHandler);
        this.handlers.set(ChatIntent.OUT_OF_SCOPE, outOfScopeHandler);
        this.handlers.set(ChatIntent.UNCLEAR, unclearHandler);
        this.handlers.set(ChatIntent.GRATITUDE, gratitudeHandler);
        this.handlers.set(ChatIntent.VIEW_OFFERS, viewOffersHandler);
        this.handlers.set(ChatIntent.NAVIGATION_HELP, navigationHelpHandler);
        this.handlers.set(ChatIntent.RETURNS, returnsHandler);
    }

    /**
     * Process incoming message and return response
     */
    async processMessage(dto: ChatMessageDto): Promise<ChatResponseDto> {
        const { message, userId } = dto;
        const sessionId = dto.sessionId || this.generateSessionId();
        const startTime = Date.now();

        try {
            // Step 1: Save user message to context
            await this.memoryService.addMessage(sessionId, 'user', message);

            // Step 2: Classify intent with NLP.js
            const intentResult = await this.nlpService.classify(message);
            this.logger.debug(
                `Classified: ${intentResult.intent} (${(intentResult.confidence * 100).toFixed(1)}%)`
            );

            // Step 3: Update state with intent
            await this.memoryService.updateState(sessionId, {
                lastIntent: intentResult.intent,
            });

            if (intentResult.intent === ChatIntent.PRODUCT_SEARCH && intentResult.entities) {
                await this.memoryService.updateFiltersFromEntities(sessionId, intentResult.entities);
            }

            // Step 4: Contextual intent resolution for short ambiguous replies
            let finalIntent = intentResult.intent;
            const lowerMessage = message.toLowerCase().trim();

            // Expanded patterns for detecting confirmations
            const affirmativeKeywords = ['sí', 'si', 'claro', 'vale', 'ok', 'quisiera', 'quiero', 'verlo', 'muestrame', 'muestra', 'dale', 'porfa', 'favor'];
            const negativeKeywords = ['no', 'nada', 'gracias no', 'no gracias'];

            const isAffirmative = affirmativeKeywords.some(kw => lowerMessage.includes(kw)) && !negativeKeywords.some(kw => lowerMessage.includes(kw));
            const isNegative = negativeKeywords.some(kw => lowerMessage.includes(kw));

            // Check if this might be a contextual reply (message doesn't look like a product search)
            const mightBeContextual = lowerMessage.length < 30 && (isAffirmative || isNegative);

            if (mightBeContextual) {
                const state = await this.memoryService.getState(sessionId);
                const context = await this.memoryService.getContext(sessionId);

                // Check last bot message for context clues
                const lastBotMessage = context?.messages?.filter(m => m.role === 'bot').slice(-1)[0];
                const lastBotText = lastBotMessage?.text?.toLowerCase() || '';

                if (isAffirmative) {
                    // User said yes - check what the bot last offered
                    if (lastBotText.includes('ofertas') || lastBotText.includes('promociones')) {
                        finalIntent = ChatIntent.VIEW_OFFERS;
                        this.logger.debug(`Contextual resolution: affirmative -> VIEW_OFFERS based on last bot message`);
                    } else if (lastBotText.includes('productos') || lastBotText.includes('relacionados') || state.lastIntent === ChatIntent.PRODUCT_SEARCH) {
                        // Continue with product search / show category products
                        finalIntent = ChatIntent.VIEW_OFFERS; // Show recommendations
                        this.logger.debug(`Contextual resolution: affirmative -> VIEW_OFFERS (see recommendations)`);
                    }
                } else if (isNegative) {
                    // User said no - acknowledge politely
                    finalIntent = ChatIntent.GRATITUDE;
                    this.logger.debug(`Contextual resolution: negative -> GRATITUDE (polite close)`);
                }
            }

            // Step 5: Get handler and execute
            const handler = this.getHandler(finalIntent);
            const response = await handler.execute(intentResult.entities, userId);

            // Step 5: Save bot response
            await this.memoryService.addMessage(sessionId, 'bot', response.text, intentResult.intent);

            // Step 6: Save product SKUs if applicable
            if (response.type === 'products' && response.content?.length > 0) {
                const skus = response.content.map((p: any) => p.codigo_dobranet || p.sku || p._id).filter(Boolean);
                await this.memoryService.setLastProductsShown(sessionId, skus);
            }

            const totalTime = Date.now() - startTime;
            this.logger.log(
                `Processed: session=${sessionId.substring(0, 8)}..., intent=${intentResult.intent}, time=${totalTime}ms`
            );

            return response;

        } catch (error) {
            this.logger.error(`Error processing message: ${error.message}`, error.stack);

            return ChatResponseDto.options(
                'Lo siento, tuve un problema al procesar tu mensaje. Por favor intenta de nuevo.',
                ['Buscar productos', 'Ayuda', 'Hablar con un agente']
            );
        }
    }

    /**
     * Get health status
     */
    async getHealth(): Promise<{ healthy: boolean; nlp: any }> {
        const nlpHealth = await this.nlpService.isHealthy();
        return {
            healthy: nlpHealth.healthy,
            nlp: nlpHealth,
        };
    }

    /**
     * Get handler for given intent
     */
    private getHandler(intent: ChatIntent): IIntentHandler {
        const handler = this.handlers.get(intent);
        if (!handler) {
            this.logger.warn(`No handler for intent: ${intent}, using unclear handler`);
            return this.unclearHandler;
        }
        return handler;
    }

    /**
     * Generate a new session ID
     */
    private generateSessionId(): string {
        return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
