import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class ReturnPolicyHandler extends BaseHandler {
    private readonly logger = new Logger(ReturnPolicyHandler.name);
    readonly intent = ChatIntent.RETURN_POLICY;

    async execute(entities: Record<string, any>, userId?: string, message?: string): Promise<ChatResponseDto> {
        this.logger.debug(`Return policy inquiry from user: ${userId || 'anonymous'}`);

        const responseMessage =
            '📜 **Política de Devoluciones**\n\n' +
            '---\n\n' +
            'En Santiago Papelería queremos que estés feliz con tu compra. Aquí tienes nuestras condiciones:\n\n' +
            '1️⃣ **Plazo:** Tienes **5 días calendario** desde que recibes el producto para solicitar una devolución.\n' +
            '2️⃣ **Estado:** El producto debe estar **sellado, sin uso y en su empaque original**.\n' +
            '3️⃣ **Reembolso:** Se procesará a tu método de pago original en un plazo de 3 a 5 días hábiles tras aprobar la devolución.\n\n' +
            '⚠️ *Productos en liquidación no tienen devolución.*';

        return ChatResponseDto.actions(responseMessage, [
            { text: '🔄 Quiero devolver un producto', type: 'message' }, // Explicit text for RETURNS intent
            { text: '💬 Hablar con soporte', type: 'message' },
            { text: '🏠 Volver al inicio', type: 'message' }
        ]);
    }
}
