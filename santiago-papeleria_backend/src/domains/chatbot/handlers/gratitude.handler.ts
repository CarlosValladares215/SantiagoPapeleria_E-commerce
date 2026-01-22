import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class GratitudeHandler extends BaseHandler {
    readonly intent = ChatIntent.GRATITUDE;

    async execute(): Promise<ChatResponseDto> {
        return ChatResponseDto.text(
            '¡De nada! Aquí estoy si necesitas algo más. 😊'
        );
    }
}
