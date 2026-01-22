import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Force recompile after .env UTF-8 fix

// Helper to load env vars directly from .env file
function loadEnvFile(): Record<string, string> {
    const envPath = path.resolve(__dirname, '..', '..', '..', '..', '.env');
    console.log('[EmailService] Loading .env from:', envPath);
    console.log('[EmailService] __dirname is:', __dirname);
    try {
        const content = fs.readFileSync(envPath, 'utf-8');
        console.log('[EmailService] File content length:', content.length);
        const vars: Record<string, string> = {};
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const eqIndex = trimmed.indexOf('=');
                if (eqIndex > 0) {
                    const key = trimmed.substring(0, eqIndex).trim();
                    const value = trimmed.substring(eqIndex + 1).trim();
                    vars[key] = value;
                }
            }
        });
        console.log('[EmailService] Loaded env keys:', Object.keys(vars));
        return vars;
    } catch (error) {
        console.error('[EmailService] Failed to load .env file:', error.message);
        return {};
    }
}

const ENV_VARS = loadEnvFile();

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private apiKey: string;
    private senderName: string;
    private senderEmail: string;
    private readonly BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

    constructor(private configService: ConfigService) {
        // Read from our manually loaded vars first, then fallback to ConfigService
        this.apiKey = ENV_VARS['BREVO_API_KEY'] || this.configService.get<string>('BREVO_API_KEY') || '';
        this.senderName = ENV_VARS['BREVO_SENDER_NAME'] || this.configService.get<string>('BREVO_SENDER_NAME') || 'Santiago Papeleria';
        this.senderEmail = ENV_VARS['BREVO_SENDER_EMAIL'] || this.configService.get<string>('BREVO_SENDER_EMAIL') || 'noreply@santiagopapeleria.com';

        if (!this.apiKey) {
            this.logger.warn('BREVO_API_KEY is not configured. Email sending will fail.');
        } else {
            this.logger.log(`Brevo API Key configured (${this.apiKey.substring(0, 15)}...)`);
        }

        this.logger.log('EmailService initialized with Brevo API configuration');
    }

    private getTemplate(templateName: string, data: Record<string, string>): string {
        try {
            const templateDir = path.join(__dirname, '..', 'templates');
            const templatePath = path.join(templateDir, templateName);

            this.logger.log(`[DEBUG] __dirname: ${__dirname}`);
            this.logger.log(`[DEBUG] Looking for template in: ${templatePath}`);

            if (fs.existsSync(templateDir)) {
                this.logger.log(`[DEBUG] Template directory exists. Contents: ${fs.readdirSync(templateDir).join(', ')}`);
            } else {
                this.logger.error(`[DEBUG] Template directory NOT FOUND at: ${templateDir}`);
            }

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

    private async sendEmail(to: string, subject: string, htmlContent: string, textContent?: string): Promise<void> {
        if (!this.apiKey) {
            throw new Error('BREVO_API_KEY is not configured');
        }

        const payload = {
            sender: { name: this.senderName, email: this.senderEmail },
            to: [{ email: to }],
            subject,
            htmlContent,
            ...(textContent && { textContent })
        };

        try {
            const response = await axios.post(this.BREVO_API_URL, payload, {
                headers: {
                    'accept': 'application/json',
                    'api-key': this.apiKey,
                    'content-type': 'application/json'
                }
            });
            this.logger.log(`Email sent to ${to} - MessageId: ${response.data.messageId}`);
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error.response?.data || error.message);
            throw error;
        }
    }

    async sendVerificationEmail(email: string, token: string, userName: string = 'Usuario'): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
        const appName = 'Santiago Papelería';

        const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
        const verificationCode = token.toUpperCase();

        const htmlContent = this.getTemplate('verification-email.html', {
            appName,
            userName,
            verificationCode,
            verificationLink,
            email
        });

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

--
${appName}
Tu aliado en útiles escolares y de oficina
`;

        try {
            await this.sendEmail(email, `✓ Verifica tu cuenta - ${appName}`, htmlContent, textContent);
            this.logger.log(`Verification email sent to ${email}`);
            this.logger.debug(`[TESTING] Verification Token: ${token}`);
        } catch (error) {
            this.logger.error(`Failed to send verification email to ${email}`, error);
            throw error;
        }
    }

    async sendPasswordResetEmail(email: string, token: string, userName: string = 'Usuario'): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
        const appName = 'Santiago Papelería';

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

        try {
            await this.sendEmail(email, `Recuperar Contraseña - ${appName}`, htmlContent, textContent);
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

        const orderDate = new Date(order.fecha_compra).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const itemsHtml = order.items.map((item: any) => `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${item.subtotal.toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = this.getTemplate('order-confirmation.html', {
            appName,
            userName: 'Cliente',
            orderNumber: order.numero_pedido_web.toString(),
            orderDate,
            itemsHtml,
            subtotal: order.resumen_financiero.subtotal_sin_impuestos.toFixed(2),
            shipping: order.resumen_financiero.costo_envio.toFixed(2),
            total: order.resumen_financiero.total_pagado.toFixed(2),
            paymentMethod: order.resumen_financiero.metodo_pago,
            ordersLink: `${frontendUrl}/orders`
        });

        try {
            await this.sendEmail(email, `Ped. #${order.numero_pedido_web} Confirmado - ${appName}`, htmlContent);
            this.logger.log(`Order confirmation email sent to ${email} for Order #${order.numero_pedido_web}`);
        } catch (error) {
            this.logger.error(`Failed to send order confirmation to ${email}`, error);
        }
    }

    async sendErpSyncNotification(email: string, syncResult: any, type: 'success' | 'warning' | 'error'): Promise<void> {
        if (!email) {
            this.logger.warn('No alert email configured for ERP sync notification');
            return;
        }

        const appName = 'Santiago Papelería';
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');

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
        const syncDate = new Date().toLocaleString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

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

        let errorDetailsHtml = '';
        if (type === 'error' && syncResult.errorDetails) {
            errorDetailsHtml = `
                <div style="background-color: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #991B1B;">Detalles del Error:</p>
                    <p style="margin: 0; font-size: 13px; color: #7F1D1D; font-family: monospace;">${syncResult.errorDetails}</p>
                </div>
            `;
        }

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

        const subjectPrefix = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌';

        try {
            await this.sendEmail(
                email,
                `${subjectPrefix} Sincronización ERP ${type === 'success' ? 'Exitosa' : type === 'warning' ? 'con Alertas' : 'Fallida'} - ${appName}`,
                htmlContent
            );
            this.logger.log(`ERP sync notification (${type}) sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send ERP sync notification to ${email}`, error);
        }
    }

    async sendReturnDecision(email: string, order: any, decision: 'APPROVE' | 'REJECT', observations: string): Promise<void> {
        const appName = 'Santiago Papelería';
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');

        const isApproved = decision === 'APPROVE';
        const decisionText = isApproved ? 'APROBADA' : 'RECHAZADA';
        const color = isApproved ? '#10B981' : '#EF4444';

        const instructions = isApproved
            ? `<p><strong>Próximos Pasos:</strong> Por favor envíe el producto a nuestra dirección principal: Av. Los Paltas y Brasil, Loja. Asegúrese de incluir el número de pedido en el paquete.</p>`
            : '';

        const observationsHtml = observations
            ? `<p><strong>Observaciones de Bodega:</strong><br><i>"${observations}"</i></p>`
            : '';

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: ${color}; text-align: center;">Solicitud de Devolución ${decisionText}</h2>
                <p>Hola estimado cliente,</p>
                <p>Le informamos que su solicitud de devolución para el pedido <strong>#${order.numero_pedido_web}</strong> ha sido <strong>${decisionText}</strong>.</p>
                
                ${observationsHtml}
                ${instructions}

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${frontendUrl}/orders" style="background-color: #012E40; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Ver Mis Pedidos</a>
                </div>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #999; text-align: center;">
                    ${appName}<br>
                    Tu aliado en útiles escolares y de oficina
                </p>
            </div>
        `;

        try {
            await this.sendEmail(email, `Devolución ${decisionText} - Pedido #${order.numero_pedido_web}`, htmlContent);
            this.logger.log(`Return decision email sent to ${email} for Order #${order.numero_pedido_web}`);
        } catch (error) {
            this.logger.error(`Failed to send return decision email to ${email}`, error);
        }
    }
}
