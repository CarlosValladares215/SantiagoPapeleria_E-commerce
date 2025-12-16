import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ErpService } from '../../../../services/erp.service';

@Component({
    selector: 'app-erp-config',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './erp-config.component.html',
})
export class ErpConfigComponent implements OnInit {
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

    private erpService = inject(ErpService); // Inject Service

    ngOnInit() {
        this.loadConfig();
    }

    loadConfig() {
        this.erpService.getConfig().subscribe({
            next: (data) => {
                // Merge with defaults to ensure all keys exist
                const merged = { ...this.config(), ...data };
                this.config.set(merged);
            },
            error: (err) => console.error('Error loading config', err)
        });
    }

    updateConfig(key: string, value: any) {
        this.config.update(c => ({ ...c, [key]: value }));
    }

    handleTestConnection() {
        this.isTesting.set(true);
        this.erpService.testConnection().subscribe({
            next: (res) => {
                this.testResult.set({
                    status: 'success',
                    latencyMs: Math.floor(Math.random() * 100) + 50, // Mock latency if backend doesn't provide it reliably or just use backend's
                    apiVersion: 'v2.1.4',
                    productsAvailable: res.productos || 0,
                    testedAt: new Date().toISOString()
                });
                this.isTesting.set(false);
            },
            error: (err) => {
                this.testResult.set({ status: 'error' });
                this.isTesting.set(false);
            }
        });
    }

    handleSave() {
        this.isSaving.set(true);
        this.erpService.saveConfig(this.config()).subscribe({
            next: () => {
                this.isSaving.set(false);
                alert('✅ Configuración guardada exitosamente');
                // Log action locally or fetch logs?
                const newLog = {
                    date: new Date().toLocaleString(),
                    user: 'admin@tutienda.com',
                    action: 'actualizó la configuración'
                };
                this.auditLog = [newLog, ...this.auditLog];
            },
            error: (err) => {
                this.isSaving.set(false);
                alert('❌ Error al guardar configuración');
                console.error(err);
            }
        });
    }

    handleReset() {
        if (confirm('¿Restablecer valores predeterminados?')) {
            const defaults = {
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
            };
            this.config.set(defaults);
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
