// src/domains/chatbot/handlers/general-help.handler.ts

import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class GeneralHelpHandler extends BaseHandler {
    readonly intent = ChatIntent.GENERAL_HELP;

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        const message =
            '🤖 **¡Hola! Soy tu asistente virtual**\n\n' +
            '---\n\n' +
            '📋 **¿Cómo puedo ayudarte?**\n\n' +
            '🔍 **Buscar productos** - Cuadernos, lápices, mochilas y más\n' +
            '📦 **Estado de pedidos** - Consulta el tracking de tus compras\n' +
            '💰 **Precios mayoristas** - Descuentos desde 12 unidades\n' +
            '🏷️ **Ofertas** - Promociones vigentes\n' +
            '📍 **Sucursales** - Ubicación y horarios\n\n' +
            '---\n\n' +
            '💬 **¿Necesitas atención personalizada?**\n' +
            'Contáctanos por WhatsApp o elige una opción:';

        return ChatResponseDto.actions(
            message,
            [
                { text: '💬 WhatsApp', url: 'https://api.whatsapp.com/send/?phone=593987667459&text=Hola+%2ASantiago+Papeleria%2A.+Necesito+m%C3%A1s+informaci%C3%B3n+sobre+Santiago+Papeleria+https%3A%2F%2Fmegasantiago.com%2F&type=phone_number&app_absent=0', type: 'navigate' },
                { text: '🔍 Buscar productos', type: 'message' },
                { text: '📦 Estado de mi pedido', type: 'message' },
                { text: '💰 Precios mayoristas', type: 'message' },
            ]
        );
    }
}
