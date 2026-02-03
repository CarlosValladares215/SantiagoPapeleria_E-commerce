// src/domains/chatbot/handlers/out-of-scope.handler.ts

import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class OutOfScopeHandler extends BaseHandler {
    readonly intent = ChatIntent.OUT_OF_SCOPE;

    async execute(entities: Record<string, any>, userId?: string, message?: string): Promise<ChatResponseDto> {
        const responseMessage =
            '🤔 **Hmm, eso está fuera de mi alcance**\n\n' +
            '---\n\n' +
            'Solo puedo ayudarte con temas de **Santiago Papelería**:\n\n' +
            '🛍️ Productos y catálogo\n' +
            '📦 Pedidos y entregas\n' +
            '💰 Precios y promociones\n' +
            '📍 Sucursales y horarios\n\n' +
            '¿Te ayudo con algo de esto?';

        return ChatResponseDto.options(
            responseMessage,
            ['🔍 Buscar productos', '📦 Estado de pedido', '💰 Precios', '❓ Ayuda']
        );
    }
}
