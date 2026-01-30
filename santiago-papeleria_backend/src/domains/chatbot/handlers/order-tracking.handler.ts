import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { PedidosService } from '../../orders/pedidos.service';
import { CatalogService } from '../../products/catalog/catalog.service';

@Injectable()
export class OrderTrackingHandler extends BaseHandler {
    private readonly logger = new Logger(OrderTrackingHandler.name);
    readonly intent = ChatIntent.ORDER_TRACKING;

    constructor(
        private readonly pedidosService: PedidosService,
        private readonly catalogService: CatalogService
    ) {
        super();
    }

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        this.logger.debug(`Order tracking inquiry from user: ${userId || 'anonymous'}`);

        // 1. User must be authenticated
        if (!userId) {
            const message =
                '🔒 **Rastreo de Pedidos**\n\n' +
                '---\n\n' +
                'Para ver tu código de seguimiento, necesito saber quién eres.\n\n' +
                '🔑 **Inicia sesión** para acceder a tus pedidos.';

            return ChatResponseDto.actions(message, [
                { text: '🔑 Iniciar sesión', url: '/login', type: 'navigate' },
                { text: '💬 Hablar con soporte', type: 'message' },
            ]);
        }

        try {
            // 2. Get shipped orders with tracking info
            const orders = await this.pedidosService.findByUser(userId);

            // Filter: Status 'ENVIADO' or has tracking info
            const trackingOrders = orders.filter(o =>
                (o.estado_pedido?.toUpperCase() === 'ENVIADO' || o.estado_pedido?.toUpperCase() === 'ENTREGADO') &&
                o.datos_envio?.guia_tracking
            );

            // 3. No orders found
            if (trackingOrders.length === 0) {
                const message =
                    '🚚 **No veo envíos activos**\n\n' +
                    '---\n\n' +
                    'No encontré pedidos recién enviados con guía de rastreo.\n\n' +
                    'Si tu pedido dice **"Preparando"**, pronto recibirás la guía por correo.';

                return ChatResponseDto.actions(message, [
                    { text: '📦 Ver mis pedidos', url: '/profile/orders', type: 'navigate' },
                    { text: '💬 Hablar con agente', type: 'message' },
                ]);
            }

            // 4. Show carousel of orders with tracking
            const recentOrders = trackingOrders
                .sort((a, b) => new Date(b.fecha_compra).getTime() - new Date(a.fecha_compra).getTime())
                .slice(0, 5);

            const message = recentOrders.length === 1
                ? `🚚 **Tu pedido #${recentOrders[0].numero_pedido_web} está en camino**\n\n` +
                '---\n\n' +
                'Aquí tienes la guía de seguimiento.\n' +
                'Haz clic para ver el detalle completo:'
                : '🚚 **Tus envíos**\n\n' +
                '---\n\n' +
                `Encontré ${recentOrders.length} pedidos enviados: **${recentOrders.map(o => '#' + o.numero_pedido_web).join(', ')}**.\n\n` +
                'Haz clic para ver el detalle completo:';

            const chatProducts = await Promise.all(recentOrders.map(async (order) => {
                let imageUrl = 'https://res.cloudinary.com/dufklhqtz/image/upload/v1769614254/tracking-icon_u4or9n.png';
                const firstItem = order.items?.[0];

                if (firstItem?.codigo_dobranet) {
                    try {
                        const product = await this.catalogService.findByTerm(firstItem.codigo_dobranet);
                        if (product && product.images && product.images.length > 0) {
                            imageUrl = product.images[0];
                        }
                    } catch (e) {
                        this.logger.warn(`Failed to fetch image for SKU ${firstItem.codigo_dobranet}: ${e.message}`);
                    }
                }

                return {
                    _id: order._id.toString(),
                    sku: order.datos_envio?.guia_tracking || 'PENDIENTE',
                    nombre: `Pedido #${order.numero_pedido_web}`,
                    price: order.resumen_financiero?.total_pagado,
                    brand: order.datos_envio?.courier || 'Santiago Envíos',
                    multimedia: {
                        principal: imageUrl
                    },
                    returnUrl: `/tracking?id=${order.numero_pedido_web}`
                };
            }));

            return ChatResponseDto.products(message, chatProducts);

        } catch (error) {
            this.logger.error(`Error fetching tracking orders: ${error.message}`);
            return ChatResponseDto.text(
                'Tuve un problema buscando tus envíos. Por favor intenta verlos en tu perfil.'
            );
        }
    }
}
