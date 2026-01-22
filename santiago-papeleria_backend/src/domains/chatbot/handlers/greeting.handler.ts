// src/domains/chatbot/handlers/greeting.handler.ts

import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class GreetingHandler extends BaseHandler {
    readonly intent = ChatIntent.GREETING;

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        const greetings = [
            '¡Hola! 👋 Bienvenido a Santiago Papelería. ¿En qué puedo ayudarte hoy?',
            '¡Buenos días! Soy el asistente de Santiago Papelería. ¿Qué necesitas?',
            '¡Hola! Es un gusto atenderte. ¿Cómo puedo asistirte?',
        ];

        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

        return ChatResponseDto.options(
            randomGreeting,
            ['Buscar productos', 'Ver ofertas', 'Estado de pedido', 'Ayuda']
        );
    }
}
