// src/domains/chatbot/orchestrator/chatbot-orchestrator.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { NlpService } from '../nlp/nlp.service';
import { ChatMemoryService } from '../memory/chat-memory.service';
import { ChatMessageDto } from '../dto/chat-message.dto';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { ChatIntent } from '../enums/chat-intent.enum';
import { IIntentHandler } from '../interfaces/intent-handler.interface';
import { SemanticOrchestrator } from './semantic-orchestrator.service';

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
import { OrderTrackingHandler } from '../handlers/order-tracking.handler';
import { OrderProcessHandler } from '../handlers/order-process.handler';
import { ReturnPolicyHandler } from '../handlers/return-policy.handler';

@Injectable()
export class ChatbotOrchestrator {
    private readonly logger = new Logger(ChatbotOrchestrator.name);
    private readonly handlers: Map<ChatIntent, IIntentHandler>;
    constructor(
        private readonly nlpService: NlpService,
        private readonly semanticOrchestrator: SemanticOrchestrator, // The Brain
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
        private readonly orderTrackingHandler: OrderTrackingHandler,
        private readonly orderProcessHandler: OrderProcessHandler,
        private readonly returnPolicyHandler: ReturnPolicyHandler,
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
        this.handlers.set(ChatIntent.ORDER_TRACKING, orderTrackingHandler);
        this.handlers.set(ChatIntent.ORDER_PROCESS, orderProcessHandler);
        this.handlers.set(ChatIntent.RETURN_POLICY, returnPolicyHandler);
    }

    /**
     * Process incoming message (Brain & Brawn Architecture)
     */
    async processMessage(dto: ChatMessageDto): Promise<ChatResponseDto> {
        const { message, userId } = dto;
        const sessionId = dto.sessionId || this.generateSessionId();
        const startTime = Date.now();

        try {
            // Step 1: Save user message to context
            await this.memoryService.addMessage(sessionId, 'user', message);

            // Step 2: The Brawn (Guardrail & Fast Path)
            // We use NLP.js to check for trivial things or security issues
            const guardrailResult = await this.nlpService.classify(message);

            let finalIntent = guardrailResult.intent;
            let entities = guardrailResult.entities;
            let usedBrain = false;

            // ========== INTELLIGENT FALLBACK: Product Availability Detection ==========
            // If NLP is uncertain OR explicitly unclear, try pattern matching
            const shouldTryPattern = (guardrailResult.confidence < 0.85 || finalIntent === ChatIntent.UNCLEAR) &&
                finalIntent !== ChatIntent.PRODUCT_SEARCH;

            if (shouldTryPattern) {
                const normalized = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                this.logger.debug(`🔬 Pattern Check: normalized="${normalized}", confidence=${guardrailResult.confidence}, intent=${finalIntent}`);

                // Detect availability questions: "venden/tienen/poseen/hay + [PRODUCT]"
                const availabilityPattern = /\b(venden|tienen|poseen|hay|manejan|cuentan con|trabajan con|disponen de)\s+([a-z0-9áéíóúñ\s]+?)(?:\s+en\s+|\?|$)/i;
                const match = normalized.match(availabilityPattern);

                this.logger.debug(`🔬 Pattern Match Result: ${match ? `YES - Groups: [${match[1]}, ${match[2]}]` : 'NO'}`);

                if (match && match[2]) {
                    const extractedProduct = match[2].trim();

                    // Validate it's not a generic term
                    const genericTerms = ['productos', 'cosas', 'articulos', 'algo', 'esto', 'eso'];
                    if (extractedProduct.length > 2 && !genericTerms.includes(extractedProduct)) {
                        this.logger.log(`🔍 Pattern Fallback: Detected availability question for "${extractedProduct}"`);
                        finalIntent = ChatIntent.PRODUCT_SEARCH;
                        entities = { ...entities, searchTerm: extractedProduct };
                    } else {
                        this.logger.debug(`🔬 Rejected: "${extractedProduct}" (length=${extractedProduct.length}, isGeneric=${genericTerms.includes(extractedProduct)})`);
                    }
                }
            } else {
                this.logger.debug(`🔬 Pattern Check Skipped: confidence=${guardrailResult.confidence} >= 0.85 AND intent=${finalIntent} is not UNCLEAR`);
            }
            // ========== END INTELLIGENT FALLBACK ==========

            // Decision Logic: Fast Path vs Brain Path
            // Trust NLP.js if:
            // 1. Confidence is extremely high (> 0.92) regardless of intent
            // 2. OR Intent is "trivial" and confidence is decent (> 0.60) - lowered to catch more cases
            // 3. OR Intent is NAVIGATION_HELP and we found a destination entity (entity overrides confidence check)
            const isHighConfidence = guardrailResult.confidence > 0.92;
            const isTrivial = this.isTrivialIntent(finalIntent) && guardrailResult.confidence > 0.60;

            this.logger.debug(`Guardrail Entities: ${JSON.stringify(entities)}`); // DEBUG LOG

            // MANUAL FALLBACK: If Navigation Help but no destination, try to guess from text
            if (finalIntent === ChatIntent.NAVIGATION_HELP) {
                // Determine if we already have a destination
                const hasDest = entities && (entities['destination'] || (Array.isArray(entities) && entities.find(e => e.entity === 'destination')));

                if (!hasDest) {
                    // Normalize message to handle accents (á->a, é->e, etc.)
                    const lowerMsg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    let manualDest: string | null = null;

                    // Be conservative - only trigger if there's clear navigation intent
                    // Check for sucursales/branches (require context words)
                    if (lowerMsg.includes('sucursal') ||
                        (lowerMsg.includes('tienda') && (lowerMsg.includes('donde') || lowerMsg.includes('ubicacion') || lowerMsg.includes('quedan')))) {
                        manualDest = 'branches';
                    }
                    // Check for direccion/addresses
                    else if (lowerMsg.includes('direccion') || lowerMsg.includes('domicilio')) {
                        manualDest = 'addresses';
                    }
                    // Check for pedidos/orders (require context)
                    else if ((lowerMsg.includes('pedido') || lowerMsg.includes('orden')) &&
                        (lowerMsg.includes('mis') || lowerMsg.includes('ver') || lowerMsg.includes('donde'))) {
                        manualDest = 'orders';
                    }
                    // Check for perfil/profile
                    else if (lowerMsg.includes('perfil') || lowerMsg.includes('cuenta')) {
                        manualDest = 'profile';
                    }

                    if (manualDest) {
                        this.logger.debug(`🔧 Manual Entity Fallback: Found ${manualDest} in text`);
                        // Normalize entities to object if null/empty
                        if (!entities || Array.isArray(entities)) {
                            // If array, push fallback
                            entities = entities || [];
                            if (Array.isArray(entities)) entities.push({ entity: 'destination', option: manualDest, score: 1 });
                        } else {
                            // If map, set key
                            entities['destination'] = manualDest;
                        }
                    }
                }
            }

            // Re-check destination existence after manual fallback
            const hasDestination = entities && (entities['destination'] || (Array.isArray(entities) && entities.find(e => e.entity === 'destination')));
            const isNavigationWithEntity = finalIntent === ChatIntent.NAVIGATION_HELP && hasDestination;


            // Special handling: If we have PRODUCT_SEARCH with searchTerm entity, trust it regardless of confidence
            const hasProductSearch = finalIntent === ChatIntent.PRODUCT_SEARCH &&
                entities &&
                !Array.isArray(entities) &&
                entities.searchTerm;

            // Clean searchTerm if it contains availability keywords that NLP incorrectly included
            if (hasProductSearch && !Array.isArray(entities) && entities.searchTerm) {
                const cleanedTerm = entities.searchTerm
                    .replace(/\b(venden|tienen|poseen|hay|manejan|cuentan con|trabajan con|disponen de)\s+/gi, '')
                    .trim();

                if (cleanedTerm !== entities.searchTerm) {
                    this.logger.log(`🧹 Cleaned searchTerm: "${entities.searchTerm}" → "${cleanedTerm}"`);
                    entities.searchTerm = cleanedTerm;
                }
            }

            if (isHighConfidence || isTrivial || isNavigationWithEntity || hasProductSearch) {
                this.logger.debug(`🚀 Fast Path (Guardrail): ${finalIntent} (${(guardrailResult.confidence * 100).toFixed(1)}%)`);
            } else {
                // Step 3: The Brain (Semantic Orchestrator)
                // If it's complex, or NLP.js is unsure, we ask the Brain
                this.logger.debug(`🧠 Brain Path (Semantic Reasoning) triggered for: "${message}"`);

                const brainResult = await this.semanticOrchestrator.process(dto, sessionId);

                // Override intent with Brain's decision
                // Note: brainResult returns a custom object { intent, reasoning, entities }
                if (brainResult && (brainResult as any).intent) {
                    finalIntent = (brainResult as any).intent;
                    entities = (brainResult as any).entities || entities;
                    usedBrain = true;
                    this.logger.debug(`Brain Decision: ${finalIntent}. Reasoning: ${(brainResult as any).text}`);
                }
            }

            // Step 4: Update state with intent
            await this.memoryService.updateState(sessionId, {
                lastIntent: finalIntent,
            });

            if (finalIntent === ChatIntent.PRODUCT_SEARCH && entities) {
                await this.memoryService.updateFiltersFromEntities(sessionId, entities);
            }

            // Step 5: Get handler and execute
            const handler = this.getHandler(finalIntent);
            const response = await handler.execute(entities, userId, message);

            // Step 6: Save bot response
            await this.memoryService.addMessage(sessionId, 'bot', response.text, finalIntent);

            // Save product SKUs context if relevant
            if (response.type === 'products' && response.content?.length > 0) {
                const skus = response.content.map((p: any) => p.codigo_dobranet || p.sku || p._id).filter(Boolean);
                await this.memoryService.setLastProductsShown(sessionId, skus);
            }

            const totalTime = Date.now() - startTime;
            this.logger.log(
                `Processed: session=${sessionId.substring(0, 8)}..., intent=${finalIntent}, mode=${usedBrain ? 'BRAIN' : 'BRAWN'}, time=${totalTime}ms`
            );

            return response;

        } catch (error) {
            this.logger.error(`Error processing message: ${error.message}`, error.stack);

            return ChatResponseDto.options(
                'Lo siento, tuve un problema neuronal temporal. Por favor intenta de nuevo.',
                ['Buscar productos', 'Ayuda', 'Hablar con humano']
            );
        }
    }

    /**
     * Determine if intent is trivial enough for Fast Path
     */
    private isTrivialIntent(intent: ChatIntent): boolean {
        const trivialIntents = [
            ChatIntent.GREETING,
            ChatIntent.GRATITUDE,
            ChatIntent.GENERAL_HELP,
            ChatIntent.OUT_OF_SCOPE,
            ChatIntent.PRICING_INFO, // Usually simple questions
            ChatIntent.NAVIGATION_HELP, // "como entro a mi perfil" is simple
            ChatIntent.HUMAN_ESCALATION, // "quiero un humano" is simple
            ChatIntent.ORDER_TRACKING, // "donde esta mi pedido" is simple
            ChatIntent.ORDER_PROCESS, // "como es el proceso de compra" is simple
            ChatIntent.ORDER_STATUS, // "estado de mi pedido" is simple
            ChatIntent.RETURN_POLICY, // "como devolver" is simple
        ];
        return trivialIntents.includes(intent);
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
