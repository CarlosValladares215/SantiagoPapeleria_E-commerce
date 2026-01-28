// src/domains/chatbot/nlp/nlp.service.ts

import { Injectable, Logger, Optional } from '@nestjs/common';
import { NlpJsAdapter } from './adapters/nlpjs.adapter';
import { OllamaAdapter } from './adapters/ollama.adapter';
import { IntentResultDto, RawLlmIntentResult } from '../dto/intent-result.dto';
import { ChatIntent, VALID_INTENTS } from '../enums/chat-intent.enum';
import { CategoryClassifierService } from '../../erp/classification/category-classifier.service';

/**
 * NLP Service - Hybrid Orchestrator
 * 
 * Strategy:
 * 1. NLP.js (primary): Fast, local, trained on domain-specific examples
 * 2. Ollama (fallback): For complex messages NLP.js can't handle
 * 
 * Flow:
 * Message → NLP.js → confidence >= 0.6? → Use result
 *                           ↓ No
 *                    Ollama → Use result (or UNCLEAR)
 */
@Injectable()
export class NlpService {
    private readonly logger = new Logger(NlpService.name);
    private readonly MIN_CONFIDENCE = 0.6;
    private ollamaAvailable = false;

    constructor(
        private readonly nlpJsAdapter: NlpJsAdapter,
        @Optional() private readonly ollamaAdapter?: OllamaAdapter,
        @Optional() private readonly categoryClassifier?: CategoryClassifierService,
    ) {
        this.checkOllamaHealth();
    }

    /**
     * Classify user message (Guardrail / Fast Path)
     */
    async classify(message: string): Promise<IntentResultDto> {
        const startTime = Date.now();

        try {
            // Step 1: NLP.js (Fast, Local, Guardrail)
            const nlpResult = await this.nlpJsAdapter.complete(message);
            const parsed = this.validateAndParse(nlpResult.parsed, message);

            // Log performance
            this.logger.debug(
                `Guardrail (NLP.js): ${parsed?.intent} (${((parsed?.confidence || 0) * 100).toFixed(1)}%) in ${Date.now() - startTime}ms`
            );

            // Directly return NLP.js result. 
            // The Logic/Orchestrator will decide if this is enough or if it needs the Brain.
            return parsed || {
                intent: ChatIntent.UNCLEAR,
                confidence: 0,
                entities: nlpResult.parsed?.entities || {},
                originalText: message,
            };

        } catch (error) {
            this.logger.error(`Guardrail error: ${error.message}`);
            return {
                intent: ChatIntent.UNCLEAR,
                confidence: 0,
                entities: {},
                originalText: message,
            };
        }
    }

    /**
     * Check Ollama availability on startup
     */
    private async checkOllamaHealth(): Promise<void> {
        if (!this.ollamaAdapter) {
            this.logger.log('Ollama adapter not configured, running NLP.js only');
            return;
        }

        try {
            this.ollamaAvailable = await this.ollamaAdapter.healthCheck();
            if (this.ollamaAvailable) {
                this.logger.log('Ollama available as fallback');
            } else {
                this.logger.warn('Ollama not available, running NLP.js only');
            }
        } catch {
            this.ollamaAvailable = false;
            this.logger.warn('Ollama health check failed');
        }
    }

    /**
     * Check if NLP subsystem is healthy
     */
    async isHealthy(): Promise<{ healthy: boolean; primary: string; fallbackAvailable: boolean }> {
        const nlpJsHealthy = await this.nlpJsAdapter.healthCheck();

        if (this.ollamaAdapter) {
            this.ollamaAvailable = await this.ollamaAdapter.healthCheck();
        }

        return {
            healthy: nlpJsHealthy,
            primary: 'nlpjs',
            fallbackAvailable: this.ollamaAvailable,
        };
    }

    /**
     * Generate response using Ollama (if available)
     */
    async generateResponse(query: string, context?: string): Promise<string> {
        if (this.ollamaAvailable && this.ollamaAdapter && this.ollamaAdapter.generateResponse) {
            return this.ollamaAdapter.generateResponse(query, context);
        }
        return 'Lo siento, no encontré lo que buscabas.';
    }

    /**
     * Classify search term into SuperCategory using semantic embeddings
     */
    async classifyCategory(searchTerm: string): Promise<{ id: string; name: string; score: number } | null> {
        if (!this.categoryClassifier) {
            this.logger.warn('CategoryClassifierService not available');
            return null;
        }

        try {
            return await this.categoryClassifier.classify(searchTerm);
        } catch (error) {
            this.logger.error(`Category classification error: ${error.message}`);
            return null;
        }
    }

    /**
     * Validate and parse NLP response
     */
    private validateAndParse(parsed: any, originalMessage: string): IntentResultDto | null {
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const raw = parsed as RawLlmIntentResult;

        // Validate intent
        if (!raw.intent || !VALID_INTENTS.includes(raw.intent as ChatIntent)) {
            return null;
        }

        // Validate confidence
        const confidence = typeof raw.confidence === 'number'
            ? Math.max(0, Math.min(1, raw.confidence))
            : 0.5;

        return {
            intent: raw.intent as ChatIntent,
            confidence,
            entities: raw.entities || {},
            originalText: raw.originalText || originalMessage,
        };
    }
}
