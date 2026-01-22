// src/domains/chatbot/handlers/returns.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class ReturnsHandler extends BaseHandler {
    private readonly logger = new Logger(ReturnsHandler.name);
    readonly intent = ChatIntent.RETURNS;

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        this.logger.debug(`Returns inquiry from user: ${userId || 'anonymous'}`);

        const message =
            '📦 Política de Devoluciones de Santiago Papelería:\n\n' +
            '✅ Tienes 15 días desde la recepción para solicitar una devolución\n' +
            '✅ El producto debe estar en su empaque original y sin uso\n' +
            '✅ Debes tener tu comprobante de compra o número de pedido\n\n' +
            '📋 Para solicitar una devolución:\n' +
            '1. Ve a "Mis Pedidos" y selecciona el pedido\n' +
            '2. Haz click en "Solicitar Devolución"\n' +
            '3. Indica el motivo y los productos a devolver\n' +
            '4. Nuestro equipo revisará tu solicitud en 24-48 horas\n\n' +
            '¿Qué deseas hacer?';

        // Check if user is logged in to show appropriate options
        if (userId) {
            return ChatResponseDto.actions(message, [
                { text: '📦 Ver mis pedidos', url: '/orders', type: 'navigate' },
                { text: '📜 Política completa', url: '/cambios-devoluciones', type: 'navigate' },
                { text: '💬 Hablar con soporte', type: 'message' },
            ]);
        } else {
            return ChatResponseDto.actions(
                message + '\n\n(Debes iniciar sesión para ver tus pedidos)',
                [
                    { text: '🔑 Iniciar sesión', url: '/login', type: 'navigate' },
                    { text: '📜 Ver política completa', url: '/cambios-devoluciones', type: 'navigate' },
                ]
            );
        }
    }
}
