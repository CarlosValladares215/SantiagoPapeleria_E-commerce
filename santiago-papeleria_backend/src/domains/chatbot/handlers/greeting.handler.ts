// src/domains/chatbot/handlers/greeting.handler.ts

import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class GreetingHandler extends BaseHandler {
    readonly intent = ChatIntent.GREETING;

    async execute(entities: Record<string, any>, userId?: string, message?: string): Promise<ChatResponseDto> {
        const hour = new Date().getHours();
        let timeGreeting = '¡Hola!';

        if (hour >= 5 && hour < 12) {
            timeGreeting = '¡Buenos días!';
        } else if (hour >= 12 && hour < 19) {
            timeGreeting = '¡Buenas tardes!';
        } else {
            timeGreeting = '¡Buenas noches!';
        }

        const responseMessage =
            `${timeGreeting} 👋\n\n` +
            `Soy el **asistente virtual** de **Santiago Papelería**.\n\n` +
            `---\n\n` +
            `Puedo ayudarte con:\n` +
            `🔍 Buscar productos\n` +
            `📦 Estado de pedidos\n` +
            `🏷️ Ver ofertas\n` +
            `❓ Resolver dudas\n\n` +
            `¿En qué puedo ayudarte hoy?`;

        return ChatResponseDto.options(
            responseMessage,
            ['🔍 Buscar productos', '🏷️ Ver ofertas', '📦 Estado de pedido', '❓ Ayuda']
        );
    }
}
