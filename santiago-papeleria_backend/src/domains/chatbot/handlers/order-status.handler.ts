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

    async execute(entities: Record<string, any>, userId?: string, message?: string): Promise<ChatResponseDto> {
        const { orderId } = entities;

        // User must be authenticated to check orders
        if (!userId) {
            const message =
                '🔐 **Inicia sesión para ver tus pedidos**\n\n' +
                '---\n\n' +
                'Necesitas iniciar sesión para:\n\n' +
                '📦 Ver el estado de tus pedidos\n' +
                '🚚 Rastrear envíos\n' +
                '📋 Ver historial de compras';

            return ChatResponseDto.actions(
                message,
                [
                    { text: '🔑 Iniciar sesión', url: '/login', type: 'navigate' },
                    { text: '💬 Hablar con un agente', type: 'message' },
                ]
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
            const message =
                '📦 **Consulta tus pedidos**\n\n' +
                '---\n\n' +
                'En "**Mis Pedidos**" puedes ver:\n\n' +
                '✅ Estado actual del pedido\n' +
                '🚚 Seguimiento de envío\n' +
                '📋 Línea de tiempo detallada\n' +
                '🧾 Detalles de la compra';

            return ChatResponseDto.actions(
                message,
                [
                    { text: '📦 Ver mis pedidos', url: '/orders', type: 'navigate' },
                    { text: '🔍 Buscar con número de pedido', type: 'message' }
                ]
            );
        } catch (error) {
            this.logger.error(`Order status error: ${error.message}`);
            return ChatResponseDto.actions(
                '⚠️ **Hubo un problema**\n\n' +
                'No pude consultar tus pedidos.\n' +
                '¿Puedo ayudarte de otra forma?',
                [
                    { text: '🔄 Intentar de nuevo', type: 'message' },
                    { text: '💬 Hablar con un agente', type: 'message' },
                ]
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
