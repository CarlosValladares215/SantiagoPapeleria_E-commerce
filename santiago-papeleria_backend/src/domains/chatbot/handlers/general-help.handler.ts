// src/domains/chatbot/handlers/general-help.handler.ts

import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class GeneralHelpHandler extends BaseHandler {
    readonly intent = ChatIntent.GENERAL_HELP;

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        return ChatResponseDto.options(
            '¡Hola! Soy el asistente virtual de Santiago Papelería. Puedo ayudarte con:\n\n' +
            '🔍 Buscar productos - Cuadernos, lápices, carpetas y más\n' +
            '📦 Estado de pedidos - Consulta el tracking de tus compras\n' +
            '💰 Información de precios - PVP y precios mayoristas\n' +
            '👤 Contactar soporte - Si necesitas ayuda personalizada\n\n' +
            '¿En qué puedo ayudarte?',
            ['Buscar productos', 'Estado de mi pedido', 'Precios mayoristas', 'Hablar con un agente']
        );
    }
}
