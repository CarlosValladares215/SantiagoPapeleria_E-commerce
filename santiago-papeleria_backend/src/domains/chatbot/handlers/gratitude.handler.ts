import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class GratitudeHandler extends BaseHandler {
    readonly intent = ChatIntent.GRATITUDE;

    async execute(entities: Record<string, any>, userId?: string, message?: string): Promise<ChatResponseDto> {
        const responseMessage =
            '😊 **¡Con mucho gusto!**\n\n' +
            '---\n\n' +
            'Estoy aquí para ayudarte.\n' +
            '¿Necesitas algo más?';

        return ChatResponseDto.options(
            responseMessage,
            ['🔍 Buscar productos', '🏷️ Ver ofertas', '❓ Otra consulta']
        );
    }
}
