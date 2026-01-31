import { Injectable, Logger } from '@nestjs/common';
import { OllamaAdapter } from '../nlp/adapters/ollama.adapter';
import { ChatMemoryService } from '../memory/chat-memory.service';
import { ChatMessageDto } from '../dto/chat-message.dto';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { ChatIntent } from '../enums/chat-intent.enum';
import { COMPANY_CONTEXT, SYSTEM_PROMPT_TEMPLATE } from '../data/company-context';

/**
 * Semantic Orchestrator - The Brain
 * 
 * Uses LLM to reason about the user's intent and context.
 * This is where the "Thinking" happens.
 */
@Injectable()
export class SemanticOrchestrator {
    private readonly logger = new Logger(SemanticOrchestrator.name);

    constructor(
        private readonly ollamaAdapter: OllamaAdapter,
        private readonly memoryService: ChatMemoryService,
    ) { }

    /**
     * Process message with deep reasoning
     */
    async process(dto: ChatMessageDto, sessionId: string): Promise<ChatResponseDto> {
        // 1. Retrieve Context (The Short-term Memory)
        const context = await this.memoryService.getContext(sessionId);
        const lastMessages = context?.messages?.slice(-5) || [];
        const historyText = lastMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

        this.logger.debug(`Reasoning with context of ${lastMessages.length} messages...`);

        // 2. Chain of Thought Classification
        // We ask the Brain to "Think" first, then "Decide".
        const contextPrompt = this.buildContextPrompt();
        const prompt = `
${contextPrompt}

HISTORIAL (Resumen):
${historyText}
USUARIO: "${dto.message}"

INTENCIONES:
- product_search: Busca productos.
- order_status: Estado pedido.
- pricing_info: Precios.
- view_offers: Ofertas.
- human_escalation: Asesor humano.
- general_help: Ayuda/Info Negocio.
- greeting: Saludo.
- out_of_scope: Fuera de tema.
- returns: Devoluciones y Garantías.
- order_tracking: Rastreo de envíos/paquetes.
- order_process: Proceso de compra y notificaciones.

RAZONA BREVEMENTE:
1. ¿Usuario responde a algo anterior?
2. ¿Tema dentro del alcance?
3. ¿Mejor intención?

RESPONDE SOLO JSON:
{
    "reasoning": "Breve motivo...",
    "intent": "INTENCION_EXACTA",
    "confidence": 0.0-1.0,
    "entities": { "searchTerm": "producto (opcional)" }
}
`;

        const thoughtProcess = await this.ollamaAdapter.complete(prompt);
        let decision: any;

        try {
            // Attempt to parse JSON strictly first
            if (thoughtProcess.parsed && typeof thoughtProcess.parsed === 'object') {
                decision = thoughtProcess.parsed;
            } else {
                throw new Error('Not object');
            }
        } catch (e) {
            // Fallback: Try to extract JSON from text if model was chatty
            const jsonMatch = thoughtProcess.raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    decision = JSON.parse(jsonMatch[0]);
                } catch (parseError) {
                    decision = { reasoning: 'Failed to parse JSON', intent: 'unclear' };
                }
            } else {
                decision = { reasoning: 'No JSON found in response', intent: 'unclear' };
            }
        }

        // 3. Execute Action based on Decision (Routing)
        // Ensure decision.intent is valid and normalized
        let intent = (decision.intent || ChatIntent.UNCLEAR).toLowerCase();

        // Validate against enum
        if (!Object.values(ChatIntent).includes(intent as ChatIntent)) {
            this.logger.warn(`Brain returned invalid intent: ${intent}. Fallback to UNCLEAR.`);
            intent = ChatIntent.UNCLEAR;
        }

        // This method should ideally return the classification result to the main orchestrator
        // But to make it compatible with the current flow, we might need a way to integrate it back.
        // For now, let's just return the intent and entities so the caller can use the handlers.

        // We will return a special response that the Main Orchestrator can understand
        // Or we simply return the "Thought" result and let the Main Orchestrator handle the dispatch.
        // Let's assume this service returns the classification result.

        return {
            type: 'thought_process',
            text: decision.reasoning,
            intent: intent as ChatIntent,
            entities: decision.entities
        } as any; // Using 'any' briefly to bypass strict DTO for internal passing
    }

    private buildContextPrompt(): string {
        // Simplified prompt to avoid cognitive overload on small models
        return `
ERES EL CEREBRO DE "{{name}}".
{{mission}}

DATOS CLAVE:
- Ubicación: {{faq.location}}
- Horarios: {{faq.hours}}
- Envíos: {{faq.shipping}}
- Devoluciones: Estrictas (5 días). {{faq.returns}}

ALCANCE:
- SÍ: {{scope.in_scope}}
- NO: {{scope.out_of_scope}}`.
            replace('{{name}}', COMPANY_CONTEXT.name)
            .replace('{{mission}}', COMPANY_CONTEXT.mission)
            .replace('{{faq.location}}', COMPANY_CONTEXT.faq.location)
            .replace('{{faq.hours}}', COMPANY_CONTEXT.faq.hours)
            .replace('{{faq.shipping}}', COMPANY_CONTEXT.faq.shipping)
            .replace('{{faq.returns}}', COMPANY_CONTEXT.faq.returns)
            .replace('{{scope.in_scope}}', COMPANY_CONTEXT.scope.in_scope.join(', '))
            .replace('{{scope.out_of_scope}}', COMPANY_CONTEXT.scope.out_of_scope.join(', '));
    }
}
