// src/domains/chatbot/handlers/human-escalation.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class HumanEscalationHandler extends BaseHandler {
    private readonly logger = new Logger(HumanEscalationHandler.name);
    readonly intent = ChatIntent.HUMAN_ESCALATION;

    async execute(entities: Record<string, any>, userId?: string, message?: string): Promise<ChatResponseDto> {
        const { reason } = entities;

        // Log escalation for future analytics
        this.logger.log(`Human escalation requested. Reason: ${reason || 'not specified'}, UserId: ${userId || 'anonymous'}`);

        // Build response based on reason
        let contextMessage = '';

        if (reason === 'problema_pedido') {
            contextMessage = '📦 Lamento que tengas un problema con tu pedido.\n\n';
        } else if (reason === 'reclamo') {
            contextMessage = '⚠️ Tu reclamo es importante para nosotros.\n\n';
        } else if (reason === 'devolucion') {
            contextMessage = '🔄 Te ayudaremos con tu solicitud de devolución.\n\n';
        }

        const responseMessage =
            '👨‍💼 **Contacta a nuestro equipo**\n\n' +
            '---\n\n' +
            contextMessage +
            '📲 **WhatsApp (más rápido)**\n' +
            '• Minorista: **0987667459**\n' +
            '• Mayorista: **0939826491**\n\n' +
            '📞 **Teléfono fijo:** 07 257 3358\n\n' +
            '📧 **Email:** ventas@santiagopapeleria.com\n\n' +
            '---\n\n' +
            '🕐 **Horario de atención:**\n' +
            'Lunes a Viernes: **9:00 - 19:00**\n' +
            'Sábados: **9:00 - 13:00**';

        return ChatResponseDto.actions(
            responseMessage,
            [
                {
                    text: 'WhatsApp (más rápido)',
                    url: 'https://api.whatsapp.com/send/?phone=593987667459&text=Hola+%2ASantiago+Papeleria%2A.+Necesito+m%C3%A1s+informaci%C3%B3n+sobre+Santiago+Papeleria+https%3A%2F%2Fmegasantiago.com%2F&type=phone_number&app_absent=0',
                    type: 'navigate',
                    icon: 'whatsapp',
                    style: 'whatsapp',
                    external: true
                },
                { text: '📧 Enviar email', url: '/contact', type: 'navigate' },
                { text: '🏠 Volver al menú', type: 'message' },
            ]
        );
    }
}
