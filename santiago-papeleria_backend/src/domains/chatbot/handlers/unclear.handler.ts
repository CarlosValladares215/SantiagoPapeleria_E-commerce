// src/domains/chatbot/handlers/unclear.handler.ts

import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class UnclearHandler extends BaseHandler {
    readonly intent = ChatIntent.UNCLEAR;

    async execute(entities: Record<string, any>, userId?: string, message?: string): Promise<ChatResponseDto> {
        // Check if user clicked "Buscar productos" without a specific term
        if (entities?.needsProductClarification) {
            const clarificationMessage =
                '🔍 **¡Perfecto! ¿Qué producto buscas?**\n\n' +
                '---\n\n' +
                'Escribe el nombre directamente, por ejemplo:\n\n' +
                '• **mochilas**\n' +
                '• **cuadernos universitarios**\n' +
                '• **lápices de colores**\n' +
                '• **carpetas A4**\n\n' +
                'O elige una categoría popular:';

            return ChatResponseDto.options(
                clarificationMessage,
                ['🎒 Mochilas', '📓 Cuadernos', '✏️ Lápices', '📁 Carpetas', '🏷️ Ver ofertas']
            );
        }

        // Generic unclear response
        const responseMessage =
            '🤔 **No estoy seguro de entenderte**\n\n' +
            '---\n\n' +
            '¿Puedes ser más específico?\n' +
            'O elige una de estas opciones:';

        return ChatResponseDto.options(
            responseMessage,
            ['🔍 Buscar productos', '📦 Estado de pedido', '💰 Precios', '💬 Hablar con agente']
        );
    }
}
