import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Force recompile after .env UTF-8 fix


@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private apiKey: string;
    private senderName: string;
    private senderEmail: string;
    private readonly BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('BREVO_API_KEY') || process.env.BREVO_API_KEY || '';
        this.senderName = this.configService.get<string>('BREVO_SENDER_NAME') || process.env.BREVO_SENDER_NAME || 'Santiago Papeleria';
        this.senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || process.env.BREVO_SENDER_EMAIL || 'noreply@santiagopapeleria.com';

        if (!this.apiKey) {
            this.logger.warn('BREVO_API_KEY is not configured. Email sending will fail.');
        } else {
            this.logger.log(`Brevo API Key configured (${this.apiKey.substring(0, 15)}...)`);
        }

        this.logger.log('EmailService initialized with Brevo API configuration');
    }

    private getFrontendUrl(): string {
        // Log all possible sources for debugging
        const envUrl = process.env.FRONTEND_URL;
        const configUrl = this.configService.get<string>('FRONTEND_URL');

        this.logger.debug(`[Debug] process.env.FRONTEND_URL: ${envUrl}`);
        this.logger.debug(`[Debug] configService.get('FRONTEND_URL'): ${configUrl}`);

        // Priority for explicit URL
        const explicitUrl = configUrl || envUrl;
        if (explicitUrl) {
            this.logger.log(`Using explicit frontend URL: ${explicitUrl}`);
            return explicitUrl;
        }

        // Granular fallbacks
        const protocol = this.configService.get<string>('FRONTEND_PROTOCOL') || process.env.FRONTEND_PROTOCOL || 'http';
        const host = this.configService.get<string>('FRONTEND_HOST') || process.env.FRONTEND_HOST || 'localhost';
        const port = this.configService.get<string>('FRONTEND_PORT') || process.env.FRONTEND_PORT || '4200';

        const constructed = `${protocol}://${host}:${port}`;
        this.logger.log(`Using constructed frontend URL: ${constructed}`);
        return constructed;
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
        const frontendUrl = this.getFrontendUrl();
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
        const frontendUrl = this.getFrontendUrl();
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
        const frontendUrl = this.getFrontendUrl();

        const orderDate = new Date(order.fecha_compra).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Safe Access Helpers
        const clientName = order.usuario_id?.razon_social || ((order.usuario_id?.nombre || '') + ' ' + (order.usuario_id?.apellido || '')) || 'Cliente Final';
        const clientRuc = order.usuario_id?.identificacion ? `RUC/CI: ${order.usuario_id.identificacion}` : '';
        const clientPhone = order.usuario_id?.telefono ? `Tel: ${order.usuario_id.telefono}` : '';
        const clientAddress = order.usuario_id?.direccion_fiscal ? `Dir: ${order.usuario_id.direccion_fiscal}` : '';

        // Shipping Address
        let shippingAddressHtml = '<p style="margin:0;color:#666;">Dirección no registrada</p>';
        if (order.datos_envio?.direccion_destino) {
            const d = order.datos_envio.direccion_destino;
            shippingAddressHtml = `
                <p style="margin:0;font-weight:bold;color:#333;">${d.calle || ''}</p>
                <p style="margin:0;color:#666;">${d.referencia || ''}</p>
                <p style="margin:0;color:#666;">${d.ciudad || ''}${d.ciudad && d.provincia ? ', ' : ''}${d.provincia || ''}</p>
            `;
        }

        const itemsHtml = order.items.map((item: any) => `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px;text-align:left;">
                    <div style="font-weight:bold;color:#333;">${item.nombre}</div>
                    <div style="font-size:11px;color:#888;">${item.codigo_dobranet || ''}</div>
                </td>
                <td style="padding:10px;text-align:right;color:#555;">${item.cantidad}</td>
                <td style="padding:10px;text-align:right;color:#555;">$${item.precio_unitario_aplicado?.toFixed(2)}</td>
                <td style="padding:10px;text-align:right;font-weight:bold;color:#333;">$${item.subtotal.toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Confirmación de Pedido</title>
        </head>
        <body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f4f4f4;">
            
            <table cellpadding="0" cellspacing="0" style="max-width:800px;margin:0 auto;background-color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                    <td style="padding:30px;background-color:#ffffff;border-bottom:2px solid #f0f0f0;">
                        <table width="100%">
                            <tr>
                                <td valign="top">
                                    <h1 style="margin:0;color:#1e3a8a;font-size:24px;">Santiago Papelería</h1>
                                    <p style="margin:5px 0 0;color:#666;font-size:13px;">Av. Principal 123, Ciudad</p>
                                    <p style="margin:0;color:#666;font-size:13px;">Tel: (02) 123-4567</p>
                                    <p style="margin:0;color:#666;font-size:13px;">RUC: 0999999999001</p>
                                </td>
                                <td valign="top" style="text-align:right;">
                                    <h2 style="margin:0;color:#333;font-size:20px;">FACTURA / PEDIDO</h2>
                                    <p style="margin:5px 0 0;color:#555;font-size:16px;font-family:monospace;">#${order.numero_pedido_web}</p>
                                    <p style="margin:2px 0;color:#888;font-size:12px;">${orderDate}</p>
                                    <div style="margin-top:5px;display:inline-block;padding:4px 8px;background-color:#f3f4f6;color:#374151;border-radius:12px;font-size:11px;font-weight:bold;text-transform:uppercase;">
                                        ${order.estado_pedido}
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Client Info -->
                <tr>
                    <td style="padding:30px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="50%" valign="top" style="padding-right:20px;">
                                    <h3 style="margin:0 0 10px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Cliente</h3>
                                    <div style="border-left:4px solid #3b82f6;padding-left:12px;">
                                        <p style="margin:0;font-weight:bold;color:#111;">${clientName}</p>
                                        <p style="margin:4px 0 0;font-size:13px;color:#555;">${order.usuario_id?.email || ''}</p>
                                        <div style="margin-top:8px;font-size:12px;color:#666;">
                                            ${clientRuc ? `<div style="margin-bottom:2px;">${clientRuc}</div>` : ''}
                                            ${clientPhone ? `<div style="margin-bottom:2px;">${clientPhone}</div>` : ''}
                                            ${clientAddress ? `<div>${clientAddress}</div>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td width="50%" valign="top">
                                    <h3 style="margin:0 0 10px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Dirección de Envío</h3>
                                    <div style="border-left:4px solid #e5e7eb;padding-left:12px;font-size:13px;">
                                        ${shippingAddressHtml}
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Items -->
                <tr>
                    <td style="padding:0 30px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <thead>
                                <tr style="border-bottom:2px solid #1f2937;">
                                    <th style="padding:10px;text-align:left;font-size:12px;color:#4b5563;text-transform:uppercase;">Descripción</th>
                                    <th style="padding:10px;text-align:right;font-size:12px;color:#4b5563;text-transform:uppercase;width:60px;">Cant.</th>
                                    <th style="padding:10px;text-align:right;font-size:12px;color:#4b5563;text-transform:uppercase;width:80px;">Unit.</th>
                                    <th style="padding:10px;text-align:right;font-size:12px;color:#4b5563;text-transform:uppercase;width:80px;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </td>
                </tr>

                <!-- Footer Summary -->
                <tr>
                    <td style="padding:30px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="60%"></td> <!-- Spacer -->
                                <td width="40%">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding:3px 0;text-align:left;color:#666;font-size:13px;">Subtotal:</td>
                                            <td style="padding:3px 0;text-align:right;color:#333;font-weight:500;">$${order.resumen_financiero.subtotal_sin_impuestos?.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:3px 0;text-align:left;color:#666;font-size:13px;">Envío:</td>
                                            <td style="padding:3px 0;text-align:right;color:#333;font-weight:500;">$${order.resumen_financiero.costo_envio?.toFixed(2)}</td>
                                        </tr>
                                        ${order.resumen_financiero.total_impuestos > 0 ? `
                                        <tr>
                                            <td style="padding:3px 0;text-align:left;color:#666;font-size:13px;">Impuestos:</td>
                                            <td style="padding:3px 0;text-align:right;color:#333;font-weight:500;">$${order.resumen_financiero.total_impuestos.toFixed(2)}</td>
                                        </tr>` : ''}
                                        <tr>
                                            <td style="padding:10px 0;text-align:left;color:#111;font-size:16px;font-weight:bold;border-top:1px solid #ddd;">TOTAL:</td>
                                            <td style="padding:10px 0;text-align:right;color:#1e3a8a;font-size:16px;font-weight:bold;border-top:1px solid #ddd;">$${order.resumen_financiero.total_pagado.toFixed(2)}</td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
                
                <!-- CTA -->
                <tr>
                    <td style="padding:0 30px 40px;text-align:center;">
                        <a href="${frontendUrl}/orders" style="display:inline-block;padding:12px 24px;background-color:#1e3a8a;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:6px;">Ver Estado del Pedido</a>
                        <p style="margin:20px 0 0;font-size:12px;color:#999;">Gracias por tu compra.</p>
                    </td>
                </tr>
            </table>

        </body>
        </html>
        `;

        try {
            await this.sendEmail(email, `Factura #${order.numero_pedido_web} - ${appName}`, htmlContent);
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
        const frontendUrl = this.getFrontendUrl();

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
        const frontendUrl = this.getFrontendUrl();

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

    // =====================================================
    // TRANSACTIONAL ORDER EMAILS
    // =====================================================

    /**
     * Send order received confirmation email (when order is created)
     */
    async sendOrderReceived(email: string, order: any): Promise<void> {
        const frontendUrl = this.getFrontendUrl();

        // Extract financials from order (handle both old and new schema)
        const resumen = order.resumen_financiero || {};
        const subtotalValue = resumen.subtotal_sin_impuestos || order.subtotal || 0;
        const totalValue = resumen.total_pagado || order.total || 0;
        const envioValue = resumen.costo_envio || order.costoEnvio || 0;
        const metodoPago = resumen.metodo_pago || order.metodoPago || 'No especificado';

        const itemsHtml = (order.items || []).map((item: any) => {
            const itemSubtotal = item.subtotal || (item.precio_unitario_aplicado || 0) * (item.cantidad || 1);
            return `
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <p style="margin: 0; font-size: 14px; font-weight: 500; color: #111827;">${item.nombre || 'Producto'}</p>
                    <p style="margin: 3px 0 0; font-size: 12px; color: #6b7280;">Cantidad: ${item.cantidad || 1}</p>
                </td>
                <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e5e5e5;">
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">$${itemSubtotal.toFixed(2)}</p>
                </td>
            </tr>
        `}).join('');

        const htmlContent = this.getTemplate('order-received.html', {
            numero_pedido: String(order.numero_pedido_web || order._id),
            fecha: new Date(order.createdAt || Date.now()).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }),
            items_html: itemsHtml,
            subtotal: `$${subtotalValue.toFixed(2)}`,
            envio: envioValue > 0 ? `$${envioValue.toFixed(2)}` : 'GRATIS',
            total: `$${totalValue.toFixed(2)}`,
            metodo_pago: metodoPago,
            tracking_url: `${frontendUrl}/orders`
        });

        try {
            await this.sendEmail(email, `Pedido Recibido #${order.numero_pedido_web || order._id} - Santiago Papelería`, htmlContent);
            this.logger.log(`Order received email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send order received email to ${email}`, error);
        }
    }

    /**
     * Send payment confirmed / invoice email
     */
    async sendPaymentConfirmed(email: string, order: any): Promise<void> {
        const frontendUrl = this.getFrontendUrl();

        // Extract financials from order (handle both old and new schema)
        const resumen = order.resumen_financiero || {};
        const subtotalValue = resumen.subtotal_sin_impuestos || order.subtotal || 0;
        const totalValue = resumen.total_pagado || order.total || 0;
        const envioValue = resumen.costo_envio || order.costoEnvio || 0;
        const impuestosValue = resumen.total_impuestos || (totalValue * 0.15 / 1.15);
        const metodoPago = resumen.metodo_pago || order.metodoPago || 'No especificado';

        const itemsTableHtml = (order.items || []).map((item: any) => {
            const precioUnitario = item.precio_unitario_aplicado || 0;
            const cantidad = item.cantidad || 1;
            const itemSubtotal = item.subtotal || (precioUnitario * cantidad);
            return `
            <tr style="border-bottom: 1px solid #e5e5e5;">
                <td style="padding: 15px 20px;">
                    <div style="font-size: 13px; font-weight: 500; color: #111827;">${item.nombre || 'Producto'}</div>
                    <div style="font-size: 11px; color: #6b7280;">${item.codigo_dobranet || ''}</div>
                </td>
                <td style="padding: 15px 10px; text-align: center; font-size: 13px; color: #374151;">${cantidad}</td>
                <td style="padding: 15px 10px; text-align: right; font-size: 13px; color: #374151;">$${precioUnitario.toFixed(2)}</td>
                <td style="padding: 15px 20px; text-align: right; font-size: 13px; font-weight: 500; color: #111827;">$${itemSubtotal.toFixed(2)}</td>
            </tr>
        `}).join('');

        // Get direccion from datos_envio (new schema) or direccionEnvio (legacy)
        const datosEnvio = order.datos_envio || {};
        const direccion = datosEnvio.direccion_destino || order.direccionEnvio || {};

        const htmlContent = this.getTemplate('payment-confirmed.html', {
            numero_pedido: String(order.numero_pedido_web || order._id),
            fecha: new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }),
            nombre_cliente: order.cliente?.nombre || order.nombre_cliente || 'Cliente',
            identificacion_cliente: order.cliente?.cedula || order.cedula_cliente || '',
            direccion_cliente: `${direccion.calle || ''}, ${direccion.ciudad || ''}`,
            email_cliente: email,
            items_table_html: itemsTableHtml,
            subtotal: `$${subtotalValue.toFixed(2)}`,
            impuestos: `$${impuestosValue.toFixed(2)}`,
            envio: envioValue > 0 ? `$${envioValue.toFixed(2)}` : 'GRATIS',
            total: `$${totalValue.toFixed(2)}`,
            metodo_pago: metodoPago,
            invoice_pdf_url: `${frontendUrl}/orders`,
            support_url: `${frontendUrl}/contact`
        });

        try {
            await this.sendEmail(email, `Factura - Pago Confirmado #${order.numero_pedido_web || order._id}`, htmlContent);
            this.logger.log(`Payment confirmed email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send payment confirmed email to ${email}`, error);
        }
    }

    /**
     * Send order preparing email (estado_pedido -> PREPARADO)
     */
    async sendOrderPreparing(email: string, order: any): Promise<void> {
        const frontendUrl = this.getFrontendUrl();

        const itemsSummaryHtml = (order.items || []).slice(0, 3).map((item: any) => `
            <div style="margin-bottom: 10px;">
                <span style="font-size: 13px; font-weight: 500; color: #111827;">${item.nombre || 'Producto'}</span>
                <span style="font-size: 12px; color: #6b7280;"> x${item.cantidad || 1}</span>
            </div>
        `).join('');

        const htmlContent = this.getTemplate('order-preparing.html', {
            nombre: order.cliente?.nombre || order.nombre_cliente || 'Cliente',
            numero_pedido: order.numero_pedido_web || order._id,
            fecha: new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }),
            items_summary_html: itemsSummaryHtml,
            tracking_url: `${frontendUrl}/orders`
        });

        try {
            await this.sendEmail(email, `Tu pedido está siendo preparado #${order.numero_pedido_web || order._id}`, htmlContent);
            this.logger.log(`Order preparing email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send order preparing email to ${email}`, error);
        }
    }

    /**
     * Send order shipped email (estado_pedido -> ENVIADO)
     */
    async sendOrderShipped(email: string, order: any): Promise<void> {
        const frontendUrl = this.getFrontendUrl();
        const firstItem = order.items?.[0];
        const extraCount = Math.max(0, (order.items?.length || 1) - 1);

        const resumen = order.resumen_financiero || {};
        const totalValue = resumen.total_pagado || order.total || 0;

        const htmlContent = this.getTemplate('order-shipped.html', {
            numero_pedido: String(order.numero_pedido_web || order._id),
            empresa_envio: order.datos_envio?.courier || order.guia?.transportadora || 'Servientrega',
            numero_guia: order.datos_envio?.guia_tracking || order.guia?.codigo || String(order.numero_pedido_web || 'Pendiente'),
            tracking_url: order.guia?.url_tracking || `${frontendUrl}/tracking/${order.numero_pedido_web || order._id}`,
            resumen_items: firstItem ? (firstItem.nombre || 'Producto') : 'Artículos de papelería',
            cantidad_items_extra: String(extraCount),
            total: `$${totalValue.toFixed(2)}`
        });

        try {
            await this.sendEmail(email, `¡Tu pedido va en camino! #${order.numero_pedido_web || order._id}`, htmlContent);
            this.logger.log(`Order shipped email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send order shipped email to ${email}`, error);
        }
    }

    /**
     * Send order delivered email (estado_pedido -> ENTREGADO)
     */
    async sendOrderDelivered(email: string, order: any): Promise<void> {
        const frontendUrl = this.getFrontendUrl();
        const datosEnvio = order.datos_envio || {};
        const direccion = datosEnvio.direccion_destino || order.direccionEnvio || {};

        const htmlContent = this.getTemplate('order-delivered.html', {
            numero_pedido: String(order.numero_pedido_web || order._id),
            direccion_entrega: `${direccion.calle || 'Dirección'}, ${direccion.ciudad || ''}`,
            fecha_entrega: new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }),
            review_url: `${frontendUrl}/orders`
        });

        try {
            await this.sendEmail(email, `¡Pedido Entregado! #${order.numero_pedido_web || order._id}`, htmlContent);
            this.logger.log(`Order delivered email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send order delivered email to ${email}`, error);
        }
    }

    /**
     * Send return requested email (estado_devolucion -> PENDIENTE)
     */
    async sendReturnRequested(email: string, order: any): Promise<void> {
        const frontendUrl = this.getFrontendUrl();

        const htmlContent = this.getTemplate('return-requested.html', {
            nombre: order.cliente?.nombre || order.nombre_cliente || 'Cliente',
            numero_pedido: order.numero_pedido_web || order._id,
            motivo: order.datos_devolucion?.motivo || 'No especificado',
            tracking_url: `${frontendUrl}/orders`
        });

        try {
            await this.sendEmail(email, `Solicitud de Devolución Recibida - Pedido #${order.numero_pedido_web || order._id}`, htmlContent);
            this.logger.log(`Return requested email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send return requested email to ${email}`, error);
        }
    }

    /**
     * Send return approved email (estado_devolucion -> APROBADA)
     */
    async sendReturnApproved(email: string, order: any): Promise<void> {
        const frontendUrl = this.getFrontendUrl();

        const htmlContent = this.getTemplate('return-approved.html', {
            nombre: order.cliente?.nombre || order.nombre_cliente || 'Cliente',
            numero_pedido: order.numero_pedido_web || order._id,
            monto_reembolso: `$${(order.total || 0).toFixed(2)}`,
            label_url: `${frontendUrl}/orders`,
            store_url: `${frontendUrl}/contact`
        });

        try {
            await this.sendEmail(email, `¡Devolución Aprobada! - Pedido #${order.numero_pedido_web || order._id}`, htmlContent);
            this.logger.log(`Return approved email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send return approved email to ${email}`, error);
        }
    }

    /**
     * Send return rejected email (estado_devolucion -> RECHAZADA)
     */
    async sendReturnRejected(email: string, order: any, observations: string): Promise<void> {
        const frontendUrl = this.getFrontendUrl();

        const htmlContent = this.getTemplate('return-rejected.html', {
            numero_pedido: order.numero_pedido_web || order._id,
            fecha: new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }),
            observaciones: observations || 'No cumple con las políticas de devolución.',
            support_url: `${frontendUrl}/contact`
        });

        try {
            await this.sendEmail(email, `Devolución No Aprobada - Pedido #${order.numero_pedido_web || order._id}`, htmlContent);
            this.logger.log(`Return rejected email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send return rejected email to ${email}`, error);
        }
    }

    /**
 * Send return received email (estado_devolucion -> RECIBIDA)
 */
    async sendReturnReceived(email: string, order: any): Promise<void> {
        const frontendUrl = this.getFrontendUrl();

        // Calculate refund amount based on returned items
        const returnedItems = order.datos_devolucion?.items || [];
        const orderItems = order.items || [];

        let subtotalRefund = 0;

        returnedItems.forEach((rItem: any) => {
            // Find original item to get price
            // Matchear por nombre ya que codigo puede no venir
            const original = orderItems.find((oItem: any) => oItem.nombre === rItem.name || oItem.nombre === rItem.nombre);
            if (original) {
                subtotalRefund += (original.precio_unitario || 0) * (rItem.quantity || rItem.cantidad || 0);
            }
        });

        const taxRate = 0.15; // 15% IVA
        const taxes = subtotalRefund * taxRate;
        const totalRefund = subtotalRefund + taxes;

        const firstItem = returnedItems[0];

        const htmlContent = this.getTemplate('return-received.html', {
            numero_pedido: order.numero_pedido_web || order._id,
            items_resumen: firstItem ? (firstItem.name || firstItem.nombre) : 'Artículos devueltos',
            cantidad: String(returnedItems.length || 1),
            monto_reembolso: `$${totalRefund.toFixed(2)}`,
            subtotal: `$${subtotalRefund.toFixed(2)}`,
            impuestos: `$${taxes.toFixed(2)}`,
            total_reembolso: `$${totalRefund.toFixed(2)}`,
            tracking_url: `${frontendUrl}/orders`,
            support_url: `${frontendUrl}/contact`
        });

        try {
            await this.sendEmail(email, `Devolución Recibida en Bodega - Pedido #${order.numero_pedido_web || order._id}`, htmlContent);
            this.logger.log(`Return received email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send return received email to ${email}`, error);
        }
    }


    /**
     * Send refund processed email (estado_pago -> REEMBOLSADO)
     */
    async sendRefundProcessed(email: string, order: any): Promise<void> {
        const frontendUrl = this.getFrontendUrl();

        const htmlContent = this.getTemplate('refund-processed.html', {
            numero_pedido: order.numero_pedido_web || order._id,
            monto_reembolso: `$${(order.total || 0).toFixed(2)}`,
            metodo_pago: order.metodoPago || 'Método original',
            fecha: new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }),
            order_url: `${frontendUrl}/orders`
        });

        try {
            await this.sendEmail(email, `Reembolso Procesado - Pedido #${order.numero_pedido_web || order._id}`, htmlContent);
            this.logger.log(`Refund processed email sent to ${email}`);
        } catch (error) {
            this.logger.error(`Failed to send refund processed email to ${email}`, error);
        }
    }
}
