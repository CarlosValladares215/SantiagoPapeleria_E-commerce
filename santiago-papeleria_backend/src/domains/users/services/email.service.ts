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

    /**
     * Envía notificación de sincronización ERP al email de alertas configurado
     * @param email Email destino (alertEmail de configuración ERP)
     * @param syncResult Resultado de la sincronización
     * @param type 'success' | 'warning' | 'error'
     */
    async sendErpSyncNotification(email: string, syncResult: any, type: 'success' | 'warning' | 'error'): Promise<void> {
        if (!email) {
            this.logger.warn('No alert email configured for ERP sync notification');
            return;
        }

        const appName = 'Santiago Papelería';
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');

        // Configure styles and messages based on type
        const config = {
            success: {
                headerStyle: 'background-color: #10B981; padding: 30px; text-align: center;',
                alertStyle: 'background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin-bottom: 25px; border-radius: 4px;',
                successNumberStyle: 'font-size: 28px; font-weight: bold; color: #10B981;',
                errorNumberStyle: 'font-size: 28px; font-weight: bold; color: #EF4444;',
                statusIcon: '✅',
                statusTitle: 'Sincronización Exitosa',
                alertMessage: 'La sincronización con DobraNet ERP se completó correctamente.',
            },
            warning: {
                headerStyle: 'background-color: #F59E0B; padding: 30px; text-align: center;',
                alertStyle: 'background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 15px; margin-bottom: 25px; border-radius: 4px;',
                successNumberStyle: 'font-size: 28px; font-weight: bold; color: #10B981;',
                errorNumberStyle: 'font-size: 28px; font-weight: bold; color: #EF4444;',
                statusIcon: '⚠️',
                statusTitle: 'Sincronización con Alertas',
                alertMessage: 'La sincronización se completó pero se detectaron algunos problemas.',
            },
            error: {
                headerStyle: 'background-color: #EF4444; padding: 30px; text-align: center;',
                alertStyle: 'background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin-bottom: 25px; border-radius: 4px;',
                successNumberStyle: 'font-size: 28px; font-weight: bold; color: #10B981;',
                errorNumberStyle: 'font-size: 28px; font-weight: bold; color: #EF4444;',
                statusIcon: '❌',
                statusTitle: 'Error de Sincronización',
                alertMessage: syncResult.errorMessage || 'La sincronización con DobraNet ERP falló.',
            }
        };

        const typeConfig = config[type];

        // Format date
        const syncDate = new Date().toLocaleString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        // Build stock alerts HTML if applicable
        let stockAlertsHtml = '';
        if ((syncResult.stockBajo > 0 || syncResult.stockAgotado > 0) && type !== 'error') {
            stockAlertsHtml = `
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
                    <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400E;">📦 Alertas de Stock</p>
                    <p style="margin: 0; font-size: 13px; color: #78350F;">
                        ${syncResult.stockBajo > 0 ? `${syncResult.stockBajo} productos con stock bajo<br>` : ''}
                        ${syncResult.stockAgotado > 0 ? `${syncResult.stockAgotado} productos agotados` : ''}
                    </p>
                </div>
            `;
        }

        // Build error details HTML if error
        let errorDetailsHtml = '';
        if (type === 'error' && syncResult.errorDetails) {
            errorDetailsHtml = `
                <div style="background-color: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #991B1B;">Detalles del Error:</p>
                    <p style="margin: 0; font-size: 13px; color: #7F1D1D; font-family: monospace;">${syncResult.errorDetails}</p>
                </div>
            `;
        }

        // Calculate next sync (tomorrow at 2 AM)
        const nextSync = new Date();
        nextSync.setDate(nextSync.getDate() + 1);
        nextSync.setHours(2, 0, 0, 0);
        const nextSyncStr = nextSync.toLocaleString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const htmlContent = this.getTemplate('erp-sync-notification.hbs', {
            appName,
            ...typeConfig,
            syncType: syncResult.triggeredBy === 'cron' ? 'Automática (Programada)' : 'Manual',
            syncDate,
            duration: syncResult.duration || 'N/A',
            productsUpdated: String(syncResult.updated || 0),
            productsNew: String(syncResult.created || 0),
            errorsCount: String(syncResult.errors?.length || 0),
            stockAlertsHtml,
            errorDetailsHtml,
            nextSync: nextSyncStr,
            dashboardLink: `${frontendUrl}/admin/erp-sync`
        });

        const fromAddress = this.configService.get<string>('SMTP_FROM', `"${appName}" <noreply@santiagopapeleria.com>`);
        const subjectPrefix = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';

        try {
            await this.transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: `${subjectPrefix} Sincronización ERP ${type === 'success' ? 'Exitosa' : type === 'warning' ? 'con Alertas' : 'Fallida'} - ${appName}`,
                html: htmlContent,
            });
            this.logger.log(`ERP sync notification (${type}) sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send ERP sync notification to ${email}`, error);
            // No lanzamos error para no interrumpir el flujo de sincronización
        }
    }
}
