import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter;

    constructor(private configService: ConfigService) {
        // Configure Nodemailer with SendGrid SMTP credentials from environment
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST', 'smtp.sendgrid.net'),
            port: this.configService.get<number>('SMTP_PORT', 587),
            secure: false, // true for 465, false for other ports (STARTTLS)
            auth: {
                user: this.configService.get<string>('SMTP_USER', 'apikey'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        this.logger.log('EmailService initialized with SMTP configuration');
    }

    private getTemplate(templateName: string, data: Record<string, string>): string {
        try {
            const templatePath = path.join(__dirname, '..', 'templates', templateName);
            let content = fs.readFileSync(templatePath, 'utf-8');

            // Replace placeholders {{key}} with value
            for (const [key, value] of Object.entries(data)) {
                content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }

            return content;
        } catch (error) {
            this.logger.error(`Failed to load template ${templateName}`, error);
            throw error;
        }
    }

    async sendVerificationEmail(email: string, token: string, userName: string = 'Usuario'): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
        const appName = 'Santiago Papelería';

        // Frontend link for user-facing verification page
        const verificationLink = `${frontendUrl}/verify-email?token=${token}`;

        // Use token directly as code (it's now a 6-char hex)
        const verificationCode = token.toUpperCase();

        const htmlContent = this.getTemplate('verification-email.html', {
            appName,
            userName,
            verificationCode,
            verificationLink,
            email
        });

        // Plain text version for email clients that don't support HTML
        const textContent = `
¡Hola ${userName}!

Bienvenido a ${appName}. Para completar tu registro, necesitamos verificar tu correo electrónico.

TU CÓDIGO DE VERIFICACIÓN: ${verificationCode}

VERIFICA TU CUENTA:
${verificationLink}

IMPORTANTE:
- Este enlace expirará en 24 horas
- Si no solicitaste esta cuenta, ignora este correo
- Por seguridad, no compartas este enlace

¿Necesitas ayuda? Contáctanos: soporte@santiagopapeleria.com

--
${appName}
Tu aliado en útiles escolares y de oficina
`;

        const fromAddress = this.configService.get<string>('SMTP_FROM', `"${appName}" <noreply@santiagopapeleria.com>`);

        try {
            const info = await this.transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: `✓ Verifica tu cuenta - ${appName}`,
                text: textContent,  // Plain text fallback
                html: htmlContent,  // HTML version
            });

            this.logger.log(`Verification email sent to ${email} - MessageId: ${info.messageId}`);
            this.logger.debug(`[TESTING] Verification Token: ${token}`);
        } catch (error) {
            this.logger.error(`Failed to send verification email to ${email}`, error);
            throw error;
        }
    }

    async sendPasswordResetEmail(email: string, token: string, userName: string = 'Usuario'): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
        const appName = 'Santiago Papelería';

        // Frontend link for password reset
        const resetLink = `${frontendUrl}/reset-password?token=${token}`;

        const htmlContent = this.getTemplate('password-reset-email.html', {
            appName,
            userName,
            resetLink
        });

        const textContent = `
Hola ${userName},

Sigue este enlace para restablecer tu contraseña:
${resetLink}

Este enlace expira en 1 hora.
Si no solicitaste esto, ignora este mensaje.
`;

        const fromAddress = this.configService.get<string>('SMTP_FROM', `"${appName}" <noreply@santiagopapeleria.com>`);

        try {
            await this.transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: `Recuperar Contraseña - ${appName}`,
                text: textContent,
                html: htmlContent,
            });
            // Removed duplicate sendMail call that was in the original code
            this.logger.log(`Password reset email sent to ${email}`);
            this.logger.debug(`[TESTING] Reset Token: ${token}`);
        } catch (error) {
            this.logger.error(`Failed to send password reset email to ${email}`, error);
            throw error;
        }
    }

    async sendOrderConfirmation(email: string, order: any): Promise<void> {
        const appName = 'Santiago Papelería';
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');

        // Formatear datos para la plantilla
        const orderDate = new Date(order.fecha_compra).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Construir HTML de items
        const itemsHtml = order.items.map((item: any) => `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${item.subtotal.toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = this.getTemplate('order-confirmation.html', {
            appName,
            userName: 'Cliente', // Se podría pasar el nombre real si estuviera disponible en el objeto order o pasado como argumento
            orderNumber: order.numero_pedido_web.toString(),
            orderDate,
            itemsHtml,
            subtotal: order.resumen_financiero.subtotal_sin_impuestos.toFixed(2),
            shipping: order.resumen_financiero.costo_envio.toFixed(2),
            total: order.resumen_financiero.total_pagado.toFixed(2),
            paymentMethod: order.resumen_financiero.metodo_pago,
            ordersLink: `${frontendUrl}/orders`
        });

        const fromAddress = this.configService.get<string>('SMTP_FROM', `"${appName}" <noreply@santiagopapeleria.com>`);

        try {
            await this.transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: `Ped. #${order.numero_pedido_web} Confirmado - ${appName}`,
                html: htmlContent,
            });
            this.logger.log(`Order confirmation email sent to ${email} for Order #${order.numero_pedido_web}`);
        } catch (error) {
            this.logger.error(`Failed to send order confirmation to ${email}`, error);
            // No lanzamos error para no interrumpir el flujo de compra, solo lo registramos
        }
    }
}

