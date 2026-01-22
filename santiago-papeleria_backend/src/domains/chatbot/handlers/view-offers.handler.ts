import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class ViewOffersHandler extends BaseHandler {
    readonly intent = ChatIntent.VIEW_OFFERS;

    async execute(): Promise<ChatResponseDto> {
        return ChatResponseDto.actions(
            '🎉 ¡Claro! Tenemos excelentes promociones vigentes. Puedes verlas todas en nuestra sección de ofertas:',
            [
                { text: '🏷️ Ver ofertas', url: '/offers', type: 'navigate' },
                { text: 'Volver al menú', type: 'message' }
            ]
        );
    }
}
