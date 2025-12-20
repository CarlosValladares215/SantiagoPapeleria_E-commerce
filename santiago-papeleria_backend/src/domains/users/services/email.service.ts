
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
        });

        this.logger.log('EmailService initialized with SMTP configuration');
    }

    async sendVerificationEmail(email: string, token: string, userName: string = 'Usuario'): Promise<void> {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
        const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');
        const appName = 'Santiago Papelería';

        // Frontend link for user-facing verification page
        const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
        // Direct backend API link as fallback
        const directApiLink = `${backendUrl}/api/usuarios/verify-email?token=${token}`;


        // Use token directly as code (it's now a 6-char hex)
        const verificationCode = token.toUpperCase();

        // Logo as base64 data URI (simple SVG icon) - works in most email clients
        const logoSvg = `data:image/svg+xml;base64,${Buffer.from(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
                <rect width="100" height="100" rx="16" fill="#F2CB07"/>
                <text x="50" y="65" font-size="50" text-anchor="middle" fill="#012E40">📦</text>
            </svg>
        `).toString('base64')}`;

        // HTML Email with ALL INLINE STYLES for maximum email client compatibility
        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Verifica tu cuenta - ${appName}</title>
    <!--[if mso]>
    <style type="text/css">
        table, td, div, p, a {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <!-- Wrapper Table -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <!-- Main Container -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #104D73 0%, #012E40 100%); padding: 40px 30px; text-align: center;">
                            <!-- Logo -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                                <tr>
                                    <td style="width: 80px; height: 80px; background-color: #F2CB07; border-radius: 16px; text-align: center; vertical-align: middle; font-size: 40px;">
                                        📦
                                    </td>
                                </tr>
                            </table>
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 20px 0 10px 0; line-height: 1.3;">¡Bienvenido a ${appName}!</h1>
                            <p style="color: #F2DF7E; font-size: 16px; margin: 0; line-height: 1.5;">Estás a un paso de completar tu registro</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <!-- Greeting -->
                            <p style="font-size: 18px; color: #333333; margin: 0 0 20px 0; line-height: 1.5;">¡Hola <strong>${userName}</strong>!</p>
                            
                            <!-- Message -->
                            <p style="font-size: 16px; color: #666666; line-height: 1.6; margin: 0 0 30px 0;">
                                Gracias por registrarte en <strong>${appName}</strong>. Para completar tu registro y activar tu cuenta, necesitamos verificar tu dirección de correo electrónico.
                            </p>
                            
                            <!-- Verification Code Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #F2CB07 0%, #F2DF7E 100%); border-radius: 12px; padding: 30px; text-align: center;">
                                        <p style="font-size: 14px; color: #012E40; font-weight: 600; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">Tu código de verificación</p>
                                        <p style="font-size: 36px; font-weight: bold; color: #012E40; letter-spacing: 8px; font-family: 'Courier New', Courier, monospace; margin: 0 0 15px 0;">${verificationCode}</p>
                                        <p style="font-size: 14px; color: #012E40; margin: 0;">Ingresa este código en la página de verificación</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                                <tr>
                                    <td align="center">
                                        <a href="${verificationLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #104D73 0%, #012E40 100%); color: #ffffff; text-decoration: none; padding: 18px 45px; border-radius: 12px; font-size: 16px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; mso-padding-alt: 0; text-align: center;">
                                            <!--[if mso]>
                                            <i style="letter-spacing: 25px; mso-font-width: -100%; mso-text-raise: 30pt;">&nbsp;</i>
                                            <![endif]-->
                                            <span style="mso-text-raise: 15pt;">✓ Verificar mi Cuenta</span>
                                            <!--[if mso]>
                                            <i style="letter-spacing: 25px; mso-font-width: -100%;">&nbsp;</i>
                                            <![endif]-->
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Alternative Link -->
                            <p style="font-size: 14px; color: #666666; margin: 0 0 10px 0; text-align: center;">
                                ¿El botón no funciona? Copia y pega este enlace en tu navegador:
                            </p>
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px;">
                                <tr>
                                    <td style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; word-break: break-all; font-size: 12px; color: #0066cc; font-family: 'Courier New', Courier, monospace;">
                                        <a href="${verificationLink}" style="color: #0066cc; text-decoration: underline;">${verificationLink}</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Expiration Warning -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
                                <tr>
                                    <td style="background-color: #fff3cd; border-left: 4px solid #F2CB07; padding: 15px; border-radius: 0 8px 8px 0;">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #856404;">
                                            <strong>⏰ Importante:</strong>
                                        </p>
                                        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #856404; line-height: 1.6;">
                                            <li>Este enlace expirará en <strong>24 horas</strong></li>
                                            <li>Si no solicitaste esta cuenta, puedes ignorar este correo</li>
                                            <li>Por seguridad, no compartas este enlace con nadie</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Help Section -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background-color: #e8f4f8; border-radius: 8px; padding: 15px; text-align: center;">
                                        <p style="margin: 0; font-size: 14px; color: #104D73;">
                                            ¿Necesitas ayuda? Contáctanos: 
                                            <a href="mailto:soporte@santiagopapeleria.com" style="color: #104D73; font-weight: 600;">soporte@santiagopapeleria.com</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="font-weight: 600; color: #104D73; margin: 0 0 10px 0; font-size: 16px;">${appName}</p>
                            <p style="font-size: 14px; color: #666666; margin: 0 0 15px 0;">Tu aliado en útiles escolares y de oficina</p>
                            <p style="font-size: 12px; color: #999999; margin: 0;">Este correo fue enviado a ${email}</p>
                        </td>
                    </tr>
                    
                </table>
                <!-- End Main Container -->
            </td>
        </tr>
    </table>
</body>
</html>`;

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

        // Logo
        const logoSvg = `data:image/svg+xml;base64,${Buffer.from(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
                <rect width="100" height="100" rx="16" fill="#F2CB07"/>
                <text x="50" y="65" font-size="50" text-anchor="middle" fill="#012E40">🔑</text>
            </svg>
        `).toString('base64')}`;

        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperar Contraseña - ${appName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: sans-serif;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #104D73 0%, #012E40 100%); padding: 40px 30px; text-align: center;">
                             <div style="width: 80px; height: 80px; background-color: #F2CB07; border-radius: 16px; margin: 0 auto; line-height: 80px; font-size: 40px;">🔑</div>
                            <h1 style="color: #ffffff; margin: 20px 0 10px 0;">Recuperar Contraseña</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="font-size: 18px; color: #333;">Hola <strong>${userName}</strong>,</p>
                            <p style="color: #666; line-height: 1.6;">Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva:</p>
                            
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="${resetLink}" style="background-color: #104D73; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #999; font-size: 14px; text-align: center;">Este enlace expirará en <strong>1 hora</strong>.</p>
                            <p style="color: #999; font-size: 14px; text-align: center;">Si no solicitaste esto, puedes ignorar este correo.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

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
            await this.transporter.sendMail({
                from: fromAddress,
                to: email,
                subject: `Recuperar Contraseña - ${appName}`,
                text: textContent,
                html: htmlContent,
            });
            this.logger.log(`Password reset email sent to ${email}`);
            this.logger.debug(`[TESTING] Reset Token: ${token}`);
        } catch (error) {
            this.logger.error(`Failed to send password reset email to ${email}`, error);
            throw error;
        }
    }
}

