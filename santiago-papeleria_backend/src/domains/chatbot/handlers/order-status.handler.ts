// src/domains/chatbot/handlers/order-status.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { PedidosService } from '../../orders/pedidos.service';

@Injectable()
export class OrderStatusHandler extends BaseHandler {
    private readonly logger = new Logger(OrderStatusHandler.name);
    readonly intent = ChatIntent.ORDER_STATUS;

    constructor(private readonly pedidosService: PedidosService) {
        super();
    }

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        const { orderId } = entities;

        // User must be authenticated to check orders
        if (!userId) {
            return ChatResponseDto.options(
                'Para consultar el estado de tu pedido, por favor inicia sesión primero.',
                ['Iniciar sesión', 'Hablar con un agente']
            );
        }

        try {
            // If specific order ID provided
            if (orderId) {
                const order = await this.pedidosService.findOne(orderId);
                if (order) {
                    return ChatResponseDto.orderStatus(
                        `Tu pedido #${order.numero_pedido_web} está en estado: ${this.translateStatus(order.estado_pedido)}`,
                        {
                            orderId: order.numero_pedido_web,
                            status: order.estado_pedido,
                            items: order.items?.length || 0,
                            total: order.resumen_financiero?.total_pagado,
                            createdAt: order.fecha_compra,
                        }
                    );
                }
                return ChatResponseDto.text(
                    `No encontré un pedido con el número ${orderId}. Verifica el número e intenta de nuevo.`
                );
            }

            // No specific order, direct to orders page
            return ChatResponseDto.actions(
                'Puedes ver el estado detallado y la línea de tiempo de todos tus pedidos en la sección "Mis Pedidos":',
                [
                    { text: '📦 Ver mis pedidos', url: '/profile/orders', type: 'navigate' },
                    { text: 'Buscar con número de pedido', type: 'message' }
                ]
            );
        } catch (error) {
            this.logger.error(`Order status error: ${error.message}`);
            return ChatResponseDto.options(
                'Hubo un error al consultar tus pedidos. ¿Puedo ayudarte de otra forma?',
                ['Intentar de nuevo', 'Hablar con un agente']
            );
        }
    }

    private translateStatus(status: string): string {
        const translations: Record<string, string> = {
            'PENDING': 'Pendiente',
            'CONFIRMED': 'Confirmado',
            'PROCESSING': 'En proceso',
            'SHIPPED': 'Enviado',
            'DELIVERED': 'Entregado',
            'CANCELLED': 'Cancelado',
        };
        return translations[status] || status;
    }
}
