import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class ViewOffersHandler extends BaseHandler {
    readonly intent = ChatIntent.VIEW_OFFERS;

    async execute(): Promise<ChatResponseDto> {
        const message =
            '🎉 **¡Ofertas y Promociones!**\n\n' +
            '---\n\n' +
            'Tenemos **descuentos especiales** en:\n\n' +
            '📚 Útiles escolares\n' +
            '🖊️ Artículos de oficina\n' +
            '🎒 Mochilas y maletas\n' +
            '✨ Productos marca CREANDO\n\n' +
            '¡Visita nuestra sección de ofertas!';

        return ChatResponseDto.actions(
            message,
            [
                { text: '🏷️ Ver todas las ofertas', url: '/offers', type: 'navigate' },
                { text: '🔍 Buscar producto específico', type: 'message' },
                { text: '🏠 Volver al menú', type: 'message' }
            ]
        );
    }
}
