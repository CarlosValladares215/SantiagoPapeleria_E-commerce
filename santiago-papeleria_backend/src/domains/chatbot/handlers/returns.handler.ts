// src/domains/chatbot/handlers/returns.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { PedidosService } from '../../orders/pedidos.service';

interface ReturnableProduct {
    _id: string;
    sku: string;
    nombre: string;
    price: number;
    brand?: string;
    multimedia?: { principal?: string };
    orderId: string;
    orderNumber: number;
}

@Injectable()
export class ReturnsHandler extends BaseHandler {
    private readonly logger = new Logger(ReturnsHandler.name);
    readonly intent = ChatIntent.RETURNS;

    constructor(private readonly pedidosService: PedidosService) {
        super();
    }

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        this.logger.debug(`Returns inquiry from user: ${userId || 'anonymous'}`);

        // If user is not logged in, show policy and login prompt
        if (!userId) {
            return this.showPolicyWithLoginPrompt();
        }

        // Get user's delivered orders eligible for return
        try {
            const deliveredOrders = await this.getDeliveredOrders(userId);

            if (deliveredOrders.length === 0) {
                return this.showNoOrdersMessage();
            }

            // Extract products from delivered orders
            const returnableProducts = this.extractReturnableProducts(deliveredOrders);

            if (returnableProducts.length === 0) {
                return this.showNoEligibleProductsMessage();
            }

            // Show carousel of returnable products
            return this.showReturnableProductsCarousel(returnableProducts);

        } catch (error) {
            this.logger.error(`Error fetching orders for returns: ${error.message}`);
            return this.showErrorMessage();
        }
    }

    private async getDeliveredOrders(userId: string): Promise<any[]> {
        const orders = await this.pedidosService.findByUser(userId);

        // Filter only delivered orders within last 10 days (visual filter, backend enforces 5 days)
        const now = new Date();
        const tenDaysAgo = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000));

        return orders.filter(order => {
            const status = order.estado_pedido?.toUpperCase();
            const orderDate = new Date(order.fecha_compra);
            const isDelivered = status === 'ENTREGADO';
            const isRecent = orderDate >= tenDaysAgo;
            const noReturnPending = !order.estado_devolucion || order.estado_devolucion === 'NINGUNA';

            return isDelivered && isRecent && noReturnPending;
        });
    }

    private extractReturnableProducts(orders: any[]): ReturnableProduct[] {
        const products: ReturnableProduct[] = [];

        for (const order of orders) {
            for (const item of order.items || []) {
                products.push({
                    _id: item.codigo_dobranet || item._id || `${order.numero_pedido_web}-${products.length}`,
                    sku: item.codigo_dobranet || 'N/A',
                    nombre: item.nombre,
                    price: item.precio_unitario_aplicado || item.subtotal / item.cantidad,
                    brand: 'Pedido #' + order.numero_pedido_web,
                    multimedia: {
                        principal: 'https://res.cloudinary.com/dufklhqtz/image/upload/v1768924502/placeholder_ni9blz.png'
                    },
                    orderId: order._id.toString(),
                    orderNumber: order.numero_pedido_web,
                });
            }
        }

        // Limit to 8 most recent products
        return products.slice(0, 8);
    }

    private showReturnableProductsCarousel(products: ReturnableProduct[]): ChatResponseDto {
        const message =
            '🔄 **Solicitar Devolución**\n\n' +
            '---\n\n' +
            '📦 Estos son los productos de tus **pedidos entregados** que puedes devolver:\n\n' +
            '👆 *Haz clic en el producto que deseas devolver*';

        // Convert to chat products format with custom URL for navigation
        const chatProducts = products.map(p => ({
            ...p,
            // Add return action URL - will navigate to orders page with return modal
            returnUrl: `/profile/orders?action=return&order=${p.orderNumber}`,
        }));

        return ChatResponseDto.products(message, chatProducts);
    }

    private showNoOrdersMessage(): ChatResponseDto {
        const message =
            '📦 **No tienes pedidos para devolver**\n\n' +
            '---\n\n' +
            'No encontré pedidos **entregados recientes** en tu cuenta.\n\n' +
            'Recuerda que tienes **5 días** desde la entrega para solicitar devolución.';

        return ChatResponseDto.actions(message, [
            { text: '📦 Ver todos mis pedidos', url: '/profile/orders', type: 'navigate' },
            { text: '📜 Política de devoluciones', url: '/cambios-devoluciones', type: 'navigate' },
            { text: '🏠 Volver al menú', type: 'message' },
        ]);
    }

    private showNoEligibleProductsMessage(): ChatResponseDto {
        const message =
            '⏰ **Tiempo de devolución expirado**\n\n' +
            '---\n\n' +
            'Tus pedidos entregados ya pasaron el plazo de **5 días** para devolución.\n\n' +
            '¿Necesitas ayuda con algo más?';

        return ChatResponseDto.actions(message, [
            { text: '📦 Ver mis pedidos', url: '/profile/orders', type: 'navigate' },
            { text: '💬 Hablar con soporte', type: 'message' },
            { text: '🏠 Volver al menú', type: 'message' },
        ]);
    }

    private showPolicyWithLoginPrompt(): ChatResponseDto {
        const message =
            '📦 **Política de Devoluciones**\n\n' +
            '---\n\n' +
            '✅ Tienes **5 días** desde la compra para solicitar devolución\n' +
            '✅ El producto debe estar **sellado y sin uso**\n' +
            '✅ Debes conservar el **empaque original** con accesorios\n' +
            '✅ Necesitas tu **factura o comprobante**\n\n' +
            '---\n\n' +
            '🔑 **Inicia sesión** para ver tus productos elegibles para devolución';

        return ChatResponseDto.actions(message, [
            { text: '🔑 Iniciar sesión', url: '/login', type: 'navigate' },
            { text: '📜 Ver política completa', url: '/cambios-devoluciones', type: 'navigate' },
        ]);
    }

    private showErrorMessage(): ChatResponseDto {
        const message =
            '⚠️ **Hubo un problema**\n\n' +
            'No pude consultar tus pedidos.\n' +
            '¿Puedo ayudarte de otra forma?';

        return ChatResponseDto.actions(message, [
            { text: '🔄 Intentar de nuevo', type: 'message' },
            { text: '💬 Hablar con soporte', type: 'message' },
            { text: '🏠 Volver al menú', type: 'message' },
        ]);
    }
}
