import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ChatbotService, ChatResponse } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
    constructor(private readonly chatbotService: ChatbotService) { }

    @Post('message')
    async sendMessage(@Body() body: { message: string, userId?: string }): Promise<ChatResponse> {
        // In a real scenario, userId would optionally come from a JWT guard via @Req() user
        // For now we accept it in body for flexibility if auth is not strictly enforced on this endpoint yet
        // or if the frontend passes it manually for this specific implementation phase.
        return this.chatbotService.processMessage(body.message, body.userId);
    }
}
