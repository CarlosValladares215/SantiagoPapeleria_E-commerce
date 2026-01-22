// src/domains/chatbot/nlp/interfaces/llm-adapter.interface.ts

export interface LlmResponse {
    raw: string;
    parsed: {
        intent: string;
        confidence: number;
        entities: any;
        originalText: string;
    };
    latencyMs: number;
    error?: string;
}

export interface ILlmAdapter {
    /**
     * Get unique name of the adapter
     */
    getName(): string;

    /**
     * Process a prompt and return classification
     */
    complete(prompt: string): Promise<LlmResponse>;

    /**
     * Check if adapter is healthy
     */
    healthCheck(): Promise<boolean>;

    /**
     * Optional: Generate a natural language response
     */
    generateResponse?(prompt: string, context?: string): Promise<string>;
}
