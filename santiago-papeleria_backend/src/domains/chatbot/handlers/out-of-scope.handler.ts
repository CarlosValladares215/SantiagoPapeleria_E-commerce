// src/domains/chatbot/handlers/out-of-scope.handler.ts

import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class OutOfScopeHandler extends BaseHandler {
    readonly intent = ChatIntent.OUT_OF_SCOPE;

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        return ChatResponseDto.options(
            'Lo siento, solo puedo ayudarte con consultas relacionadas a Santiago Papelería. ' +
            '¿Hay algo sobre nuestros productos, pedidos o servicios en lo que pueda asistirte?',
            ['Buscar productos', 'Estado de pedido', 'Precios', 'Ayuda']
        );
    }
}
