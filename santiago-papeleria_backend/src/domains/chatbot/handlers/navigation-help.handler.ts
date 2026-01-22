// src/domains/chatbot/handlers/navigation-help.handler.ts

import { Injectable, Logger } from '@nestjs/common';
import { BaseHandler } from './base.handler';
import { ChatIntent } from '../enums/chat-intent.enum';
import { ChatResponseDto } from '../dto/chat-response.dto';

/**
 * Navigation destinations the bot can guide users to
 */
interface NavigationDestination {
    url: string;
    description: string;
    requiresAuth: boolean;
    buttonText: string;
}

const NAVIGATION_MAP: Record<string, NavigationDestination> = {
    // Public routes
    'products': { url: '/products', description: 'catálogo de productos', requiresAuth: false, buttonText: '🛒 Ver catálogo' },
    'offers': { url: '/offers', description: 'ofertas y promociones', requiresAuth: false, buttonText: '🏷️ Ver ofertas' },
    'cart': { url: '/cart', description: 'carrito de compras', requiresAuth: false, buttonText: '🛒 Ir al carrito' },
    'contact': { url: '/contact', description: 'página de contacto', requiresAuth: false, buttonText: '📧 Contactar' },
    'login': { url: '/login', description: 'inicio de sesión', requiresAuth: false, buttonText: '🔑 Iniciar sesión' },
    'register': { url: '/register', description: 'crear cuenta', requiresAuth: false, buttonText: '📝 Crear cuenta' },
    'forgot_password': { url: '/forgot-password', description: 'recuperar contraseña', requiresAuth: false, buttonText: '🔐 Recuperar contraseña' },

    // Protected routes
    'profile': { url: '/profile?tab=personal', description: 'perfil personal', requiresAuth: true, buttonText: '👤 Mi perfil' },
    'addresses': { url: '/profile?tab=addresses&action=new', description: 'gestión de direcciones', requiresAuth: true, buttonText: '📍 Mis direcciones' },
    'orders': { url: '/orders', description: 'historial de pedidos', requiresAuth: true, buttonText: '📦 Mis pedidos' },
    'tracking': { url: '/tracking', description: 'seguimiento de envío', requiresAuth: true, buttonText: '🚚 Rastrear envío' },
    'favorites': { url: '/profile?tab=favorites', description: 'productos favoritos', requiresAuth: true, buttonText: '❤️ Mis favoritos' },
    'password': { url: '/profile?tab=personal', description: 'cambiar contraseña', requiresAuth: true, buttonText: '🔒 Cambiar contraseña' },
};

@Injectable()
export class NavigationHelpHandler extends BaseHandler {
    private readonly logger = new Logger(NavigationHelpHandler.name);
    readonly intent = ChatIntent.NAVIGATION_HELP;

    async execute(entities: Record<string, any>, userId?: string): Promise<ChatResponseDto> {
        const destination = entities.destination as string;

        this.logger.debug(`Navigation help requested: destination=${destination}, userId=${userId || 'anon'}`);

        // If no destination detected, offer generic help menu
        if (!destination || !NAVIGATION_MAP[destination]) {
            return this.showNavigationMenu();
        }

        const nav = NAVIGATION_MAP[destination];

        // Check if requires auth and user is not logged in
        if (nav.requiresAuth && !userId) {
            return ChatResponseDto.actions(
                `Para acceder a ${nav.description}, primero necesitas iniciar sesión.`,
                [
                    { text: '🔑 Iniciar sesión', url: '/login', type: 'navigate' },
                    { text: '📝 Crear cuenta', url: '/register', type: 'navigate' },
                ]
            );
        }

        // Return navigation action
        return ChatResponseDto.actions(
            `¡Claro! Te llevo a ${nav.description}:`,
            [
                { text: nav.buttonText, url: nav.url, type: 'navigate' },
                { text: 'Otra consulta', type: 'message' },
            ]
        );
    }

    private showNavigationMenu(): ChatResponseDto {
        return ChatResponseDto.actions(
            '¿A dónde te gustaría ir? Puedo ayudarte a navegar:',
            [
                { text: '🛒 Ver catálogo', url: '/products', type: 'navigate' },
                { text: '🏷️ Ver ofertas', url: '/offers', type: 'navigate' },
                { text: '📦 Mis pedidos', url: '/orders', type: 'navigate' },
                { text: '👤 Mi perfil', url: '/profile?tab=personal', type: 'navigate' },
                { text: '📍 Mis direcciones', url: '/profile?tab=addresses', type: 'navigate' },
            ]
        );
    }
}
