// src/domains/chatbot/handlers/human-escalation.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class HumanEscalationHandler extends BaseHandler {
    private readonly logger = new Logger(HumanEscalationHandler.name);
    readonly intent = ChatIntent.HUMAN_ESCALATION;

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        const { reason } = entities;

        // Log escalation for future analytics
        this.logger.log(`Human escalation requested. Reason: ${reason || 'not specified'}, UserId: ${userId || 'anonymous'}`);

        // Build response based on reason
        let message = '¡Entendido! ';

        if (reason === 'problema_pedido') {
            message += 'Lamento que tengas un problema con tu pedido. ';
        } else if (reason === 'reclamo') {
            message += 'Tu reclamo es importante para nosotros. ';
        } else if (reason === 'devolucion') {
            message += 'Te ayudaremos con tu solicitud de devolución. ';
        }

        message += 'Un agente se pondrá en contacto contigo a la brevedad.\n\n';
        message += '📧 También puedes escribirnos a: soporte@santiagopapeleria.com\n';
        message += '📞 O llamarnos al: 099-123-4567\n\n';
        message += 'Horario de atención: Lunes a Viernes, 9:00 - 18:00';

        // TODO: Future implementation - Send notification to support team
        // this.notificationService.notifySupportTeam({ userId, reason });

        return ChatResponseDto.text(message);
    }
}
