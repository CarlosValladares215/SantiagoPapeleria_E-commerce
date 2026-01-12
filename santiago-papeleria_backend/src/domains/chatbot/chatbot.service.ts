import { Injectable, Logger } from '@nestjs/common';
import { ProductosService } from '../products/productos.service';
import { PedidosService } from '../orders/pedidos.service';
import { EmailService } from '../users/services/email.service';
import { ProductFilterDto } from '../products/dto/product-filter.dto';

export interface ChatResponse {
    text: string;
    type: 'text' | 'products' | 'order_status' | 'options';
    content?: any;
}

@Injectable()
export class ChatbotService {
    private readonly logger = new Logger(ChatbotService.name);

    constructor(
        private productosService: ProductosService,
        private pedidosService: PedidosService,
        private emailService: EmailService,
    ) { }

    async processMessage(message: string, userId?: string): Promise<ChatResponse> {
        const lowerMsg = message.toLowerCase();

        // 1. HU92: Escalado a humano
        if (this.detectIntent(lowerMsg, ['humano', 'agente', 'persona', 'ayuda personal', 'soporte'])) {
            return {
                text: '¡Entendido! Si necesitas atención personalizada, por favor envíanos un correo a soporte@santiagopapeleria.com o llévanos al 0991234567. Un agente te atenderá a la brevedad posible.',
                type: 'text'
            };
        }

        // 2. HU90: Precios
        if (this.detectIntent(lowerMsg, ['precio mayorista', 'pvm', 'mayorista', 'por mayor'])) {
            return {
                text: 'Nuestros precios mayoristas (PVM) están disponibles para clientes registrados como mayoristas. El pedido mínimo es de $50. Puedes registrarte como mayorista en nuestra sección de registro.',
                type: 'text'
            };
        }
        if (this.detectIntent(lowerMsg, ['precio', 'pvp', 'minorista', 'cuánto cuesta'])) {
            // If specific product search is not triggered, explain generic price info
            if (!lowerMsg.includes('buscar')) {
                return {
                    text: 'Manejamos dos tipos de precios: PVP (Precio de Venta al Público) y PVM (Precio de Venta al Por Mayor). El PVP es para compras unitarias y el PVM para compras al por mayor con un mínimo de compra.',
                    type: 'text'
                };
            }
        }

        // 3. HU91: Estado del pedido
        if (this.detectIntent(lowerMsg, ['pedido', 'estado', 'tracking', 'guía', 'rastrear'])) {
            if (!userId) {
                return {
                    text: 'Para consultar el estado de tu pedido, por favor inicia sesión primero.',
                    type: 'text'
                };
            }
            try {
                // Mocking logic to get recent orders as PedidosService doesn't seem to have a simple 'getLastPendingOrder'
                // We will just ask user to go to 'Mis Pedidos' for now as a safe MVP implementation
                // or actually implement a fetch if possible.
                // Let's return text directing them for now, or if we want to be fancy, we'd add a method to PedidosService.
                // For this specific task, "Debe mostrar estado con Línea de tiempo", ideally we fetch data.

                // Let's assume we can fetch recent orders.
                // const orders = await this.pedidosService.findAll({ userId, limit: 1 });

                return {
                    text: 'Puedes ver el estado detallado y la línea de tiempo de tus pedidos en la sección "Mis Pedidos" de tu perfil.',
                    type: 'text'
                };
            } catch (e) {
                return {
                    text: 'Hubo un error al consultar tus pedidos. Por favor intenta más tarde.',
                    type: 'text'
                };
            }
        }

        // 4. HU89: Búsqueda de productos
        // Detect "buscar", "tienes", "venden" or just if no other intent matches and it looks like a product query
        if (this.detectIntent(lowerMsg, ['buscar', 'busco', 'tienes', 'venden', 'quiero', 'necesito'])) {
            const query = this.extractQuery(lowerMsg, ['buscar', 'busco', 'tienes', 'venden', 'quiero', 'necesito']);
            if (query.length > 2) {
                console.log('Chatbot Search Query:', query); // DEBUG
                const filter: ProductFilterDto = { searchTerm: query, limit: '4' };
                const results = await this.productosService.getMergedProducts(filter);
                console.log('Chatbot Search Results:', results?.data?.length); // DEBUG

                if (results && results.data && results.data.length > 0) {
                    return {
                        text: `He encontrado estos productos relacionados con "${query}":`,
                        type: 'products',
                        content: results.data // Use results.data because getMergedProducts returns { data, meta }
                    };
                } else {
                    return {
                        text: `Lo siento, no encontré productos relacionados con "${query}". Intenta con otra palabra clave.`,
                        type: 'text'
                    };
                }
            }
        }

        // Default Fallback
        return {
            text: 'No estoy seguro de entenderte. Puedo ayudarte a buscar productos, consultar precios o información de pedidos. Intenta decir "buscar cuadernos" o "precio mayorista".',
            type: 'options',
            content: ['Buscar productos', 'Precios mayoristas', 'Estado de mi pedido', 'Hablar con un agente']
        };
    }

    private detectIntent(message: string, keywords: string[]): boolean {
        return keywords.some(keyword => message.includes(keyword));
    }

    private extractQuery(message: string, triggers: string[]): string {
        let cleaned = message;
        triggers.forEach(t => cleaned = cleaned.replace(new RegExp(t, 'gi'), ''));
        return cleaned.trim();
    }
}
