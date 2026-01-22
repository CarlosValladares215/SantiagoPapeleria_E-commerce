// src/domains/chatbot/nlp/adapters/ollama.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ILlmAdapter, LlmResponse } from '../interfaces/llm-adapter.interface';
import { ChatIntent, VALID_INTENTS } from '../../enums/chat-intent.enum';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { of } from 'rxjs';

/**
 * Ollama Adapter - For fallback when NLP.js can't classify.
 * 
 * Used as a secondary classifier for:
 * - Complex messages NLP.js doesn't understand
 * - Potential RAG queries
 * - Edge cases
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
        this.timeoutMs = parseInt(this.configService.get<string>('OLLAMA_TIMEOUT_MS', '30000'));

        this.logger.log(`Ollama configured: ${this.ollamaUrl}, model: ${this.model}`);
    }

    getName(): string {
        return 'ollama';
    }

    /**
     * Classify message using Ollama
     */
    async complete(prompt: string): Promise<LlmResponse> {
        const startTime = Date.now();

        try {
            // Build classification prompt
            const systemPrompt = this.buildClassificationPrompt(prompt);

            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: this.model,
                    prompt: systemPrompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_predict: 100,
                    },
                }).pipe(
                    timeout(this.timeoutMs),
                    catchError(error => {
                        this.logger.warn(`Ollama request failed: ${error.message}`);
                        return of({ data: { response: null } });
                    })
                )
            );

            const latencyMs = Date.now() - startTime;
            const rawResponse = response.data?.response || '';

            // Parse JSON from response
            const parsed = this.parseResponse(rawResponse, prompt);

            return {
                raw: rawResponse,
                parsed,
                latencyMs,
            };

        } catch (error) {
            this.logger.error(`Ollama error: ${error.message}`);
            return {
                raw: '',
                parsed: {
                    intent: ChatIntent.UNCLEAR,
                    confidence: 0.3,
                    entities: {},
                    originalText: prompt,
                },
                latencyMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }

    /**
     * Build a classification prompt for Ollama
     */
    private buildClassificationPrompt(message: string): string {
        return `Eres un experto en clasificación de intenciones para un e-commerce.

INTENCIONES VÁLIDAS:
- product_search: Buscar productos. EJEMPLOS: "busco mochilas", "tienen cuadernos?", "venden lapices", "precio de carpetas", "hay goma?".
- order_status: Estado de pedido. EJEMPLOS: "donde esta mi pedido", "tracking", "status de orden".
- pricing_info: Preguntar precios generales o mayoristas. EJEMPLOS: "precios al por mayor", "cuanto cuesta".
- view_offers: Ver ofertas o promociones. EJEMPLOS: "ver ofertas", "promociones", "descuentos", "rebajas".
- human_escalation: Hablar con humano. EJEMPLOS: "asesor", "persona real".
- general_help: Ayuda. EJEMPLOS: "ayuda", "que puedes hacer".
- greeting: Saludo. EJEMPLOS: "hola", "buenos dias".
- out_of_scope: Fuera de contexto. EJEMPLOS: "clima", "chiste", "capital de francia".
- unclear: No se entiende o no es ninguna de las anteriores. EJEMPLOS: "no", "si", "entonces no?", "ok".

REGLAS DE EXTRACCIÓN DE ENTIDADES (CRÍTICO):
1. 'searchTerm' debe ser SOLO el PRODUCTO (sustantivo + adjetivo).
2. ELIMINA verbos (quiero, busco, venderan, tienen), conectores (y, el, la, los), y preguntas.
3. EJEMPLO: "venderan tambien huevos kinder?" -> {"intent": "product_search", "entities": {"searchTerm": "huevos kinder"}}
4. EJEMPLO: "entonces no los venden?" -> {"intent": "unclear"} (NO ES BÚSQUEDA)

RESPONDE SOLO EL JSON:
{"intent": "INTENT", "confidence": 0.0-1.0, "entities": {"searchTerm": "SOLO_PRODUCTO_LIMPIO"}}

MENSAJE: "${message}"

JSON:`;
    }

    /**
     * Parse Ollama response to extract intent
     */
    private parseResponse(raw: string, originalMessage: string): any {
        try {
            // Try to extract JSON from response
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                // Validate intent
                let intent = parsed.intent as string;
                if (!VALID_INTENTS.includes(intent as ChatIntent)) {
                    intent = ChatIntent.UNCLEAR;
                }

                return {
                    intent,
                    confidence: parsed.confidence || 0.7,
                    entities: parsed.entities || {},
                    originalText: originalMessage,
                };
            }
        } catch (e) {
            this.logger.warn(`Failed to parse Ollama response: ${e.message}`);
        }

        return {
            intent: ChatIntent.UNCLEAR,
            confidence: 0.3,
            entities: {},
            originalText: originalMessage,
        };
    }

    /**
     * Generate a natural language response
     */
    async generateResponse(query: string, context?: string): Promise<string> {
        try {
            const prompt = `Eres Asistente Santiago, un empleado amable de "Santiago Papelería".
CONTEXTO: ${context || 'El usuario está buscando un producto.'}
USUARIO DICE: "${query}"

Tu tarea: Responder amablemente al usuario.
- Si el contexto es que no hay stock, NO digas "no encontré resultados". Dilo más natural: "Lo siento, por ahora no contamos con X, pero tenemos..."
- Sé breve y servicial.
- Usa emojis moderados.

RESPUESTA:`;

            const response = await firstValueFrom(
                this.httpService.post(`${this.ollamaUrl}/api/generate`, {
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.7, num_predict: 150 },
                }).pipe(
                    timeout(this.timeoutMs),
                    catchError(() => of({ data: { response: null } }))
                )
            );

            return response.data?.response?.trim() || 'Lo siento, no pude procesar tu solicitud en este momento.';
        } catch (error) {
            this.logger.error(`Ollama generation error: ${error.message}`);
            return 'Disculpa, tuve un problema técnico.';
        }
    }

    /**
     * Check if Ollama is available
     */
    async healthCheck(): Promise<boolean> {

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.ollamaUrl}/api/tags`).pipe(
                    timeout(3000),
                    catchError(() => of({ data: null }))
                )
            );
            return !!response.data;
        } catch {
            return false;
        }
    }
}
