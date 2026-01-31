// src/domains/chatbot/handlers/order-process.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class OrderProcessHandler extends BaseHandler {
    private readonly logger = new Logger(OrderProcessHandler.name);
    readonly intent = ChatIntent.ORDER_PROCESS;

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        this.logger.debug(`Order process inquiry`);

        const message =
            '📦 **Proceso de tu Compra**\n\n' +
            '---\n\n' +
            '¡Es muy sencillo! Te mantendremos informado en cada paso vía **Outlook/Email**:\n\n' +
            '1️⃣ **Confirmación:** Recibes un correo cuando validamos tu pago.\n' +
            '2️⃣ **Preparación:** Te avisamos cuando estamos empacando tus productos.\n' +
            '3️⃣ **Envío:** ¡Lo más importante! Te enviamos el **número de guía** para que rastrees tu paquete.\n' +
            '4️⃣ **Entrega:** Confirmamos que recibiste todo correctamente.\n\n' +
            '---\n\n' +
            '¿Quieres revisar el estado de un pedido actual?';

        return ChatResponseDto.actions(message, [
            { text: '🚚 Rastrear pedido', type: 'message' },
            { text: '📦 Ver mis pedidos', url: '/profile/orders', type: 'navigate' },
            { text: '💬 Hablar con agente', type: 'message' },
        ]);
    }
}
