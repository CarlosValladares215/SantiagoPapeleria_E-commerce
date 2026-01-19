// src/domains/chatbot/dto/chat-message.dto.ts

import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ChatMessageDto {
    @IsString()
    @MaxLength(500)
    message: string;

    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    sessionId?: string;
}
