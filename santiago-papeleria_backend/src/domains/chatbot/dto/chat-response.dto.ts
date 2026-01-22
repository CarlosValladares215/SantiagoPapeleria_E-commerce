// src/domains/chatbot/dto/chat-response.dto.ts

export type ChatResponseType = 'text' | 'products' | 'order_status' | 'options' | 'actions';

export interface ChatAction {
    text: string;
    url?: string;  // If provided, frontend navigates to this URL
    type?: 'navigate' | 'message';  // 'navigate' opens URL, 'message' sends as chat
}

export class ChatResponseDto {
    text: string;
    type: ChatResponseType;
    content?: any;
    suggestedActions?: string[];

    constructor(partial: Partial<ChatResponseDto>) {
        Object.assign(this, partial);
    }

    static text(message: string, suggestedActions?: string[]): ChatResponseDto {
        return new ChatResponseDto({ text: message, type: 'text', suggestedActions });
    }

    static products(message: string, products: any[]): ChatResponseDto {
        return new ChatResponseDto({ text: message, type: 'products', content: products });
    }

    static options(message: string, options: string[]): ChatResponseDto {
        return new ChatResponseDto({ text: message, type: 'options', content: options });
    }

    static orderStatus(message: string, orderData: any): ChatResponseDto {
        return new ChatResponseDto({ text: message, type: 'order_status', content: orderData });
    }

    /**
     * Actions with navigation support - buttons that can navigate to URLs
     */
    static actions(message: string, actions: ChatAction[]): ChatResponseDto {
        return new ChatResponseDto({ text: message, type: 'actions', content: actions });
    }
}
