import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SyncStats {
  updated: number;
  newProduct: number;
  errors: number;
}

export interface SyncErrorItem {
  code: string;
  name: string;
  error: string;
  action: string;
}

export interface SyncLogEntry {
  time: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export interface SyncErrorDetail {
  title: string;
  message: string;
  url: string;
  code: string;
}

export interface SyncEmailData {
  syncType: string;
  date: string;
  duration?: string; // Optional for error state
  status: string;
  attempts?: string; // For error state
  stats?: SyncStats;
  errorList?: SyncErrorItem[];
  logs?: SyncLogEntry[];
  errorDetails?: SyncErrorDetail[]; // List of error causes or specific error object
  nextScheduled?: string;
  alertMessage?: string; // Custom message for the alert box
}

@Component({
  selector: 'app-sync-email-preview',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `
    <div class="email-container">
      <!-- Header -->
      <div class="header" [ngClass]="{'header-error': type === 'error', 'header-default': type !== 'error'}">
        <h1 *ngIf="type === 'success'">✅ Sincronización Exitosa</h1>
        <h1 *ngIf="type === 'warning'">🔄 Alerta de Sincronización ERP</h1>
        <h1 *ngIf="type === 'error'">❌ Error de Sincronización</h1>
      </div>

      <!-- Content -->
      <div class="content">

        <!-- Icons -->
        <div class="icon-container" *ngIf="type === 'success'">
            <div class="success-icon-circle">✓</div>
        </div>
        <div class="icon-container" *ngIf="type === 'error'">
             <div class="error-icon-circle">✕</div>
        </div>


        <!-- Alert Box -->
        <div class="alert-box" [ngClass]="{
          'success': type === 'success',
          'warning': type === 'warning'
        }">
          <h2 class="alert-title" *ngIf="type === 'success'">Sincronización completada exitosamente</h2>
          <h2 class="alert-title" *ngIf="type === 'warning'">⚠️ Sincronización completada con errores</h2>
          <h2 class="alert-title" *ngIf="type === 'error'">La sincronización ha fallado</h2>
          
          <p class="alert-message">
            {{ data?.alertMessage || 'Mensaje de alerta por defecto...' }}
          </p>
        </div>

        <!-- Sync Information -->
        <div class="info-grid">
          <div class="info-row">
            <div class="info-label">Tipo de Sincronización:</div>
            <div class="info-value">{{ data?.syncType }}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Fecha y Hora:</div>
            <div class="info-value">{{ data?.date }}</div>
          </div>
          <div class="info-row" *ngIf="data?.duration">
            <div class="info-label">Duración:</div>
            <div class="info-value">{{ data?.duration }}</div>
          </div>
          <div class="info-row" *ngIf="data?.attempts">
            <div class="info-label">Intentos realizados:</div>
            <div class="info-value">{{ data?.attempts }}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Estado:</div>
            <div class="info-value">{{ data?.status }}</div>
          </div>
        </div>

        <!-- Statistics (Success/Warning only) -->
        <table class="stats-container" cellpadding="0" cellspacing="10" *ngIf="type !== 'error' && data?.stats">
          <tr>
            <td class="stat-box">
              <p class="stat-number" [ngClass]="{'green-text': type === 'success', 'blue-text': type !== 'success'}">{{ data?.stats?.updated }}</p>
              <p class="stat-label">Productos Actualizados</p>
            </td>
            <td class="stat-box">
              <p class="stat-number black-text">{{ data?.stats?.newProduct }}</p>
              <p class="stat-label">Productos Nuevos</p>
            </td>
            <td class="stat-box">
              <p class="stat-number black-text">{{ data?.stats?.errors }}</p>
              <p class="stat-label">Errores</p>
            </td>
          </tr>
        </table>

        <div class="divider"></div>

        <!-- Success Summary -->
        <ng-container *ngIf="type === 'success'">
            <h3 class="section-title">Resumen de Cambios</h3>
            <ul class="summary-list">
                <li>Precios actualizados: {{ data?.stats?.updated }} productos</li>
                <li>Stock actualizado: {{ data?.stats?.updated }} productos</li>
                <li>Información de productos sincronizada</li>
                <li>Sin conflictos detectados</li>
            </ul>
        </ng-container>

        <!-- Error Details Table (Warning) -->
        <ng-container *ngIf="(type === 'warning') && data?.errorList?.length">
          <h3 class="section-title">Detalles de Errores</h3>
          <table class="error-table">
            <thead>
              <tr>
                <th>Código Producto</th>
                <th>Nombre</th>
                <th>Error</th>
                <th>Acción Tomada</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let error of data?.errorList">
                <td><span class="error-code">{{ error.code }}</span></td>
                <td>{{ error.name }}</td>
                <td>{{ error.error }}</td>
                <td>{{ error.action }}</td>
              </tr>
            </tbody>
          </table>
          <div class="divider"></div>
        </ng-container>

        <!-- Critical Error Details (Error Type) -->
        <ng-container *ngIf="type === 'error' && data?.errorDetails">
             <h3 class="section-title">Detalles del Error</h3>
             <div class="error-details" *ngFor="let detail of data?.errorDetails">
                <h4>{{ detail.title }}</h4>
                <p>{{ detail.message }}</p>
                <p *ngIf="detail.url">URL: {{ detail.url }}</p>
                <p>Código de error: {{ detail.code }}</p>
            </div>

            <h3 class="section-title" style="margin-top: 30px;">Posibles Causas</h3>
            <ul class="summary-list">
                <li>El servidor de DobraNet ERP no está disponible</li>
                <li>Problemas de conectividad de red</li>
                <li>Token de autenticación expirado o inválido</li>
                <li>Firewall bloqueando la conexión</li>
            </ul>

            <div class="action-steps">
                <h4>🔧 Pasos Recomendados</h4>
                <ol>
                    <li>Verifica el estado del servidor DobraNet ERP</li>
                    <li>Comprueba la configuración de la API en el panel de administración</li>
                    <li>Revisa que el token de autenticación sea válido</li>
                    <li>Intenta ejecutar una sincronización manual</li>
                </ol>
            </div>
        </ng-container>

        <!-- Logs (Warning) -->
        <ng-container *ngIf="(type === 'warning') && data?.logs?.length">
          <h3 class="section-title">Log Detallado</h3>
          <div class="log-section">
            <div *ngFor="let log of data?.logs">
              [{{ log.time }}] 
              <span [ngClass]="{
                'log-success': log.type === 'success',
                'log-warning': log.type === 'warning',
                'log-error': log.type === 'error'
              }">
                {{ log.message }}
              </span>
            </div>
          </div>
        </ng-container>

        <!-- CTA -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="#" class="button" [ngClass]="{'secondary': type === 'error'}">
               {{ type === 'error' ? 'Intentar Sincronización Manual' : 'Ver Detalles Completos en el Panel' }}
            </a>
            <br *ngIf="type === 'error'">
            <a href="#" class="button secondary" *ngIf="type === 'error'" style="margin-top: 10px; background-color: #104D73;">
                Revisar Configuración
            </a>
        </div>

        <!-- Footer Info -->
        <p class="help-text" *ngIf="data?.nextScheduled">
             <strong>{{ type === 'error' ? 'Próximo intento automático:' : 'Próxima sincronización programada:' }}</strong><br>
             {{ data?.nextScheduled }}
        </p>

      </div>

      <!-- Footer -->
      <div class="footer">
        <p><strong>Tu Tienda E-commerce</strong></p>
        <p>Sistema de Sincronización ERP - DobraNet</p>
        <div class="footer-links">
            <a href="#">Configuración</a> | 
            <a href="#">Ver Logs</a> | 
            <a href="#">Dashboard</a>
        </div>
        <p class="footer-note">
            Este es un mensaje automático. Por favor no respondas a este email.
        </p>
        <p class="critical-alert" *ngIf="type === 'error'">
            <strong>⚠️ Alerta Crítica - Requiere Atención Inmediata</strong>
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
    body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f3f4f6;
    }
    .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
    }
    .header {
        padding: 30px 40px;
        text-align: center;
    }
    .header-default { background-color: #104D73; }
    .header-error { background-color: #dc2626; }
    .header h1 {
        margin: 0;
        color: #ffffff;
        font-size: 24px;
        font-weight: 600;
    }
    .content { padding: 40px; }
    
    .alert-box {
        background-color: #fef2f2;
        border-left: 4px solid #ef4444;
        padding: 20px;
        margin-bottom: 30px;
        border-radius: 4px;
    }
    .alert-box.success {
        background-color: #f0fdf4;
        border-left-color: #22c55e;
    }
    .alert-box.warning {
        background-color: #fffbeb;
        border-left-color: #f59e0b;
    }
    .alert-title {
        margin: 0 0 10px 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
    }
    .alert-message {
        margin: 0;
        font-size: 14px;
        color: #4b5563;
        line-height: 1.6;
    }

    .info-grid {
        display: table;
        width: 100%;
        margin: 30px 0;
        border-collapse: collapse;
    }
    .info-row { display: table-row; }
    .info-label {
        display: table-cell;
        padding: 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #6b7280;
        width: 40%;
        border-bottom: 1px solid #e5e7eb;
    }
    .info-value {
        display: table-cell;
        padding: 12px 0;
        font-size: 14px;
        color: #111827;
        border-bottom: 1px solid #e5e7eb;
    }

    .stats-container {
        display: table;
        width: 100%;
        margin: 20px 0;
    }
    .stat-box {
        display: table-cell;
        text-align: center;
        padding: 20px;
        background-color: #f9fafb;
        border-radius: 8px;
    }
    .stat-box + .stat-box { padding-left: 10px; }
    .stat-number {
        font-size: 28px;
        font-weight: 700;
        margin: 0;
    }
    .green-text { color: #22c55e; }
    .blue-text { color: #104D73; }
    .black-text { color: #104D73; } /* Default blueish for others per original CSS */

    .stat-label {
        font-size: 12px;
        color: #6b7280;
        margin: 5px 0 0 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .divider {
        height: 1px;
        background-color: #e5e7eb;
        margin: 30px 0;
    }
    .section-title {
        color: #111827;
        font-size: 16px;
        margin-bottom: 15px;
    }

    /* Error Table */
    .error-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 13px;
    }
    .error-table th {
        background-color: #f9fafb;
        padding: 12px;
        text-align: left;
        font-weight: 600;
        color: #374151;
        border-bottom: 2px solid #e5e7eb;
    }
    .error-table td {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
        color: #4b5563;
    }
    .error-code {
        font-family: 'Courier New', monospace;
        background-color: #f3f4f6;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
    }

    /* Logs */
    .log-section {
        background-color: #1f2937;
        color: #d1d5db;
        padding: 20px;
        border-radius: 8px;
        margin: 20px 0;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        line-height: 1.8;
        overflow-x: auto;
    }
    .log-success { color: #86efac; }
    .log-error { color: #fca5a5; }
    .log-warning { color: #fcd34d; }

    /* Buttons */
    .button {
        display: inline-block;
        padding: 14px 28px;
        background-color: #104D73;
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 14px;
        margin: 5px;
    }
    .button.secondary { background-color: #dc2626; } /* Error button color */
    
    /* Footer */
    .footer {
        background-color: #f9fafb;
        padding: 30px 40px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
    }
    .footer p {
        margin: 5px 0;
        font-size: 13px;
        color: #6b7280;
    }
    .footer-links a {
        color: #104D73;
        text-decoration: none;
    }
    .footer-note {
        margin-top: 15px !important;
        font-size: 12px !important;
    }
    .critical-alert {
        margin-top: 10px !important;
        font-size: 12px !important;
        color: #dc2626 !important;
    }

    /* Error Specific */
    .error-icon, .icon-container {
        text-align: center;
        margin: 30px 0;
    }
    .error-icon-circle {
        display: inline-block;
        width: 80px;
        height: 80px;
        background-color: #fee2e2;
        border-radius: 50%;
        line-height: 80px;
        font-size: 40px;
    }
    .success-icon-circle {
        display: inline-block;
        width: 80px;
        height: 80px;
        background-color: #dcfce7;
        border-radius: 50%;
        line-height: 80px;
        font-size: 40px;
    }
    .error-details {
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
    }
    .error-details h4 {
        margin: 0 0 10px 0;
        color: #991b1b;
        font-size: 14px;
    }
    .error-details p {
        margin: 5px 0;
        color: #7f1d1d;
        font-size: 13px;
        font-family: 'Courier New', monospace;
    }
    .action-steps {
        background-color: #fffbeb;
        border-left: 4px solid #f59e0b;
        padding: 20px;
        margin: 20px 0;
        border-radius: 4px;
    }
    .action-steps h4 {
        margin: 0 0 15px 0;
        color: #92400e;
        font-size: 15px;
    }
    .action-steps ol {
        margin: 0;
        padding-left: 20px;
        color: #78350f;
        font-size: 14px;
        line-height: 1.8;
    }
    .summary-list {
        color: #4b5563;
        font-size: 14px;
        line-height: 1.8;
    }
    .help-text {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.6;
        margin-top: 30px;
        text-align: center;
    }
  `]
})
export class SyncEmailPreviewComponent {
  @Input() type: 'success' | 'warning' | 'error' = 'success';
  @Input() data: SyncEmailData | undefined;
}
