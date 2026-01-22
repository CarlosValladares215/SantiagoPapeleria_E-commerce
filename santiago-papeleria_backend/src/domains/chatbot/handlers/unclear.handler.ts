// src/domains/chatbot/handlers/unclear.handler.ts

import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class UnclearHandler extends BaseHandler {
    readonly intent = ChatIntent.UNCLEAR;

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        // Check if user clicked "Buscar productos" without a specific term
        if (entities?.needsProductClarification) {
            return ChatResponseDto.options(
                '¡Perfecto! 🔍 ¿Qué producto te gustaría buscar?\n\n' +
                'Puedes escribir el nombre del producto directamente, por ejemplo:\n' +
                '• "mochilas"\n' +
                '• "cuadernos universitarios"\n' +
                '• "lápices de colores"',
                ['Mochilas', 'Cuadernos', 'Lápices', 'Carpetas', 'Ver ofertas']
            );
        }

        // Generic unclear response
        return ChatResponseDto.options(
            'No estoy seguro de entenderte. ¿Puedes ser más específico o elegir una de estas opciones?',
            ['Buscar productos', 'Estado de mi pedido', 'Precios mayoristas', 'Hablar con un agente']
        );
    }
}
