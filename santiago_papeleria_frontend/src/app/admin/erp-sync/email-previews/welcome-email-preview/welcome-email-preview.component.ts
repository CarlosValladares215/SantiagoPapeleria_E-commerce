import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-welcome-email-preview',
    standalone: true,
    imports: [CommonModule],
    encapsulation: ViewEncapsulation.ShadowDom,
    template: `
    <div class="email-container">
      <!-- Header -->
      <div class="header">
        <div class="logo">📦</div>
        <h1>¡Bienvenido a Santiago Papelería!</h1>
        <p>Estás a un paso de completar tu registro</p>
      </div>

      <!-- Content -->
      <div class="content">
        <p class="greeting">¡Hola {{ userName }}!</p>
        
        <p class="message">
            Gracias por registrarte en Santiago Papelería. Para completar tu registro y activar tu cuenta, 
            necesitamos verificar tu dirección de correo electrónico.
        </p>

        <!-- Verification Code Box -->
        <div class="verification-box">
            <div class="verification-label">Tu código de verificación</div>
            <div class="verification-code">{{ verificationCode }}</div>
            <p style="font-size: 14px; color: #012E40; margin: 0;">
                Ingresa este código en la página de verificación
            </p>
        </div>

        <!-- Verify Button -->
        <div class="button-container">
            <a [href]="verificationLink" class="verify-button">
                ✓ Verificar mi Cuenta
            </a>
        </div>

        <p class="alternative-text">O copia y pega este enlace en tu navegador:</p>
        <div class="link-box">
            {{ verificationLink }}
        </div>

        <!-- Important Info -->
        <div class="info-box">
            <p>
                <strong>⏰ Importante:</strong> Este código expirará en 24 horas. 
                Si no verificas tu cuenta en este tiempo, deberás registrarte nuevamente.
            </p>
        </div>

        <div class="divider"></div>

        <p class="message">
            Una vez verificada tu cuenta, podrás:
        </p>
        <ul style="color: #666666; font-size: 15px; line-height: 1.8; margin-left: 20px; margin-bottom: 20px;">
            <li>Acceder a más de 30,000 productos</li>
            <li>Disfrutar de precios especiales</li>
            <li>Realizar seguimiento de tus pedidos</li>
            <li>Guardar tus productos favoritos</li>
            <li>Recibir ofertas exclusivas</li>
        </ul>

        <p class="message" style="font-size: 14px; color: #999999;">
            Si no creaste esta cuenta, puedes ignorar este correo de forma segura.
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="font-weight: 600; color: #104D73; margin-bottom: 15px;">Santiago Papelería</p>
        <p>Tu aliado en útiles escolares y de oficina</p>
        <p style="font-size: 12px; color: #999999; margin-top: 15px;">
            📍 Dirección de la tienda<br>
            📞 Teléfono: (123) 456-7890<br>
            ✉️ Email: info@santiagopapeleria.com
        </p>
        
        <div class="social-links">
            <a href="#" title="Facebook">📘</a>
            <a href="#" title="Instagram">📷</a>
            <a href="#" title="WhatsApp">💬</a>
        </div>

        <p style="font-size: 12px; color: #999999; margin-top: 20px;">
            © 2024 Santiago Papelería. Todos los derechos reservados.
        </p>
      </div>
    </div>
  `,
    styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f5f5f5;
        padding: 20px;
    }
    .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
        background: linear-gradient(135deg, #104D73 0%, #012E40 100%);
        padding: 40px 30px;
        text-align: center;
    }
    .logo {
        width: 80px;
        height: 80px;
        background-color: #F2CB07;
        border-radius: 16px;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
    }
    .header h1 {
        color: #ffffff;
        font-size: 28px;
        font-weight: bold;
        margin-bottom: 10px;
    }
    .header p {
        color: #F2DF7E;
        font-size: 16px;
    }
    .content {
        padding: 40px 30px;
    }
    .greeting {
        font-size: 18px;
        color: #333333;
        margin-bottom: 20px;
    }
    .message {
        font-size: 16px;
        color: #666666;
        line-height: 1.6;
        margin-bottom: 30px;
    }
    .verification-box {
        background: linear-gradient(135deg, #F2CB07 0%, #F2DF7E 100%);
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        margin-bottom: 30px;
    }
    .verification-label {
        font-size: 14px;
        color: #012E40;
        font-weight: 600;
        margin-bottom: 15px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .verification-code {
        font-size: 36px;
        font-weight: bold;
        color: #012E40;
        letter-spacing: 8px;
        font-family: 'Courier New', monospace;
        margin-bottom: 20px;
        user-select: all;
    }
    .button-container {
        text-align: center;
        margin-bottom: 30px;
    }
    .verify-button {
        display: inline-block;
        background: linear-gradient(135deg, #104D73 0%, #012E40 100%);
        color: #ffffff;
        text-decoration: none;
        padding: 16px 40px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        transition: transform 0.2s;
    }
    .verify-button:hover {
        transform: translateY(-2px);
    }
    .alternative-text {
        font-size: 14px;
        color: #999999;
        text-align: center;
        margin-bottom: 20px;
    }
    .link-box {
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 15px;
        word-break: break-all;
        font-size: 12px;
        color: #666666;
        margin-bottom: 30px;
    }
    .info-box {
        background-color: #fff3cd;
        border-left: 4px solid #F2CB07;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 30px;
    }
    .info-box p {
        font-size: 14px;
        color: #856404;
        margin: 0;
    }
    .footer {
        background-color: #f8f9fa;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e9ecef;
    }
    .footer p {
        font-size: 14px;
        color: #666666;
        margin-bottom: 10px;
    }
    .social-links {
        margin-top: 20px;
    }
    .social-links a {
        display: inline-block;
        margin: 0 10px;
        color: #104D73;
        text-decoration: none;
        font-size: 24px;
    }
    .divider {
        height: 1px;
        background-color: #e9ecef;
        margin: 30px 0;
    }
    @media only screen and (max-width: 600px) {
        .email-container {
            border-radius: 0;
        }
        .header, .content, .footer {
            padding: 30px 20px;
        }
        .verification-code {
            font-size: 28px;
            letter-spacing: 4px;
        }
    }
  `]
})
export class WelcomeEmailPreviewComponent {
    @Input() userName: string = '';
    @Input() verificationCode: string = '';
    @Input() verificationLink: string = '';
}
