import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-erp-config',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './erp-config.component.html',
})
export class ErpConfigComponent {
    showAuthToken = signal(false);
    showWebhookSecret = signal(false);
    isAdvancedOpen = signal(false);
    isTesting = signal(false);
    testResult = signal<any>(null);
    isSaving = signal(false);

    config = signal({
        baseUrl: 'https://api.dobranet.com',
        authToken: 'sk_live_51MZxYz2eZvKYlo2C8xYz2eZvKYlo2C',
        webhookSecret: 'whsec_51MZxYz2eZvKYlo2C8xYz2eZvKYlo2C',
        webhookUrl: 'https://tu-tienda.com/api/webhooks/dobranet',
        autoSync: true,
        dailySyncTime: '02:00',
        timezone: 'GMT-5',
        notifySuccess: false,
        notifyErrors: true,
        alertEmail: 'admin@tutienda.com',
        includeDetailedLogs: true,
        sendDailySummary: false,
        timeout: 30,
        retries: 3,
        validateSSL: true,
        logRequestsResponses: true
    });

    auditLog = [
        {
            date: '08/12/2025 14:30',
            user: 'admin@example.com',
            action: 'actualizó el token de autenticación'
        },
        {
            date: '05/12/2025 09:15',
            user: 'admin@example.com',
            action: 'cambió la hora de sincronización a 02:00 AM'
        },
        {
            date: '01/12/2025 16:45',
            user: 'admin@example.com',
            action: 'configuró el webhook URL'
        }
    ];

    updateConfig(key: string, value: any) {
        this.config.update(c => ({ ...c, [key]: value }));
    }

    handleTestConnection() {
        this.isTesting.set(true);
        setTimeout(() => {
            this.testResult.set({
                status: 'success',
                latencyMs: 145,
                apiVersion: 'v2.1.4',
                productsAvailable: 1247,
                testedAt: new Date().toISOString()
            });
            this.isTesting.set(false);
        }, 2000);
    }

    handleSave() {
        this.isSaving.set(true);
        setTimeout(() => {
            this.isSaving.set(false);
            alert('✅ Configuración guardada exitosamente');
        }, 1500);
    }

    handleReset() {
        if (confirm('¿Restablecer valores predeterminados?')) {
            this.config.set({
                baseUrl: 'https://api.dobranet.com',
                authToken: '',
                webhookSecret: '',
                webhookUrl: 'https://tu-tienda.com/api/webhooks/dobranet',
                autoSync: true,
                dailySyncTime: '02:00',
                timezone: 'GMT-5',
                notifySuccess: false,
                notifyErrors: true,
                alertEmail: '',
                includeDetailedLogs: true,
                sendDailySummary: false,
                timeout: 30,
                retries: 3,
                validateSSL: true,
                logRequestsResponses: true
            });
        }
    }

    copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        alert('✅ Copiado al portapapeles');
    }

    regenerateToken() {
        if (confirm('¿Regenerar token?')) {
            const newToken = 'sk_live_' + Math.random().toString(36).substring(2, 15);
            this.updateConfig('authToken', newToken);
            alert('✅ Token regenerado');
        }
    }
}
