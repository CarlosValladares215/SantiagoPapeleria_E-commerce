// src/domains/chatbot/nlp/adapters/ollama.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ILlmAdapter, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ChatIntent, VALID_INTENTS } from '../../enums/chat-intent.enum';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';

/**
 * Ollama Adapter - The Brain Interface
 * 
 * Responsibilities:
 * 1. Generate Embeddings for Semantic Search
 * 2. Structured JSON Output for Intent Classification
 * 3. Specialized Generation for specific tasks (RAG synthesis)
 */
@Injectable()
export class OllamaAdapter implements ILlmAdapter {
    private readonly logger = new Logger(OllamaAdapter.name);
    private readonly ollamaUrl: string;
    private readonly model: string;
    private readonly timeoutMs: number;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.ollamaUrl = this.configService.get<string>('OLLAMA_URL', 'http://localhost:11434');
        this.model = this.configService.get<string>('OLLAMA_MODEL', 'llama3.2');
        this.timeoutMs = parseInt(this.configService.get<string>('OLLAMA_TIMEOUT_MS', '60000')); // Increased timeout for "deep thinking"

        this.logger.log(`Ollama Brain configured: ${this.ollamaUrl}, model: ${this.model}`);
    }

    getName(): string {
        return 'ollama-brain';
    }

    /**
     * Generate structured completion (JSON)
     */
    async complete(prompt: string): Promise<LlmResponse> {
        const startTime = Date.now();

        try {
            // Force JSON format in system prompt if not present
            const systemPrompt = prompt.includes('JSON') ? prompt : `${prompt}\nRESPOND ONLY IN JSON.`;

            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: this.model,
                    prompt: systemPrompt,
                    format: 'json', // Native Ollama JSON mode
                    stream: false,
                    options: {
                        temperature: 0.1, // Low temp for logic/classification
                        num_predict: 256,
                    },
                }).pipe(
                    timeout(this.timeoutMs),
                    catchError(error => {
                        this.logger.warn(`Ollama brain freeze: ${error.message}`);
                        return of({ data: { response: null } });
                    })
                )
            );

            const latencyMs = Date.now() - startTime;
            const rawResponse = response.data?.response || '';
            const parsed = this.safeJsonParse(rawResponse, prompt);

            return {
                raw: rawResponse,
                parsed,
                latencyMs,
            };

        } catch (error) {
            this.logger.error(`Ollama fatal error: ${error.message}`);
            return {
                raw: '',
                parsed: this.getErrorIntent(prompt),
                latencyMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }

    /**
     * Generate Embeddings for Semantic Search
     */
    async getEmbedding(text: string): Promise<number[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/embeddings`, {
                    model: this.model, // Ideally use an embedding model like 'nomic-embed-text'
                    prompt: text,
                }).pipe(
                    timeout(5000),
                    catchError(() => of({ data: { embedding: [] } }))
                )
            );

            return response.data?.embedding || [];
        } catch (error) {
            this.logger.warn(`Embedding failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Generate natural response with context
     */
    async generateResponse(query: string, context?: string): Promise<string> {
        return this.generateText(query, context);
    }

    /**
     * Generic text generation
     */
    async generateText(prompt: string, context?: string): Promise<string> {
        try {
            const fullPrompt = context
                ? `SYSTEM: ${context}\nUSER: ${prompt}`
                : prompt;

            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: this.model,
                    prompt: fullPrompt,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 300 },
                }).pipe(
                    timeout(this.timeoutMs),
                    catchError(() => of({ data: { response: null } }))
                )
            );

            return response.data?.response?.trim() || 'Lo siento, mi cerebro está desconectado temporalmente.';
        } catch (error) {
            this.logger.error(`Generation error: ${error.message}`);
            return 'Error procesando tu solicitud.';
        }
    }

    private safeJsonParse(jsonString: string, originalMessage: string): any {
        try {
            const parsed = JSON.parse(jsonString);
            return {
                intent: parsed.intent || ChatIntent.UNCLEAR,
                confidence: parsed.confidence || 0.8,
                entities: parsed.entities || {},
                reasoning: parsed.reasoning || 'No reasoning provided',
                originalText: originalMessage
            };
        } catch (e) {
            this.logger.warn(`JSON Parse failed. Raw response: "${jsonString}"`);
            return this.getErrorIntent(originalMessage);
        }
    }

    private getErrorIntent(msg: string): any {
        return {
            intent: ChatIntent.UNCLEAR,
            confidence: 0,
            entities: {},
            originalText: msg
        };
    }

    async healthCheck(): Promise<boolean> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.ollamaUrl}/api/tags`).pipe(
                    timeout(2000),
                    catchError(() => of({ data: null }))
                )
            );
            return !!response.data;
        } catch {
            return false;
        }
    }
}
