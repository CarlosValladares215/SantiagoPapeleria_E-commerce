// src/domains/chatbot/handlers/pricing-info.handler.ts

import { Injectable } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

@Injectable()
export class PricingInfoHandler extends BaseHandler {
    readonly intent = ChatIntent.PRICING_INFO;

    async execute(entities: Record<string, any>, userId?: string, message?: string): Promise<ChatResponseDto> {
        // Correct pricing info based on actual business logic
        return ChatResponseDto.text(
            '💰 **Sistema de Precios**\n\n' +
            '• **PVP (Precio de Venta al Público)**: Aplica para compras de 1 a 11 unidades del mismo producto.\n\n' +
            '• **PVM (Precio de Venta al Por Mayor)**: Se aplica automáticamente cuando seleccionas **12 o más unidades** del mismo producto. ¡No necesitas registrarte!\n\n' +
            '📝 El precio mayorista se calcula automáticamente en el carrito.',
            ['Buscar productos', 'Ver ofertas', 'Hablar con un agente']
        );
    }
}
