// src/domains/chatbot/chatbot.controller.ts

import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { ChatbotOrchestrator } from './orchestrator/chatbot-orchestrator.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

@Controller('chatbot')
export class ChatbotController {
    private readonly logger = new Logger(ChatbotController.name);

    constructor(private readonly orchestrator: ChatbotOrchestrator) { }

    /**
     * Process a user message and return bot response
     */
    @Post('message')
    async sendMessage(@Body() dto: ChatMessageDto): Promise<ChatResponseDto> {
        this.logger.debug(`Received message: ${dto.message?.substring(0, 50)}...`);
        return this.orchestrator.processMessage(dto);
    }

    /**
     * Health check endpoint for frontend to determine if chatbot should be displayed
     */
    @Get('health')
    async getHealth(): Promise<{ healthy: boolean; nlp: any }> {
        return this.orchestrator.getHealth();
    }
}
