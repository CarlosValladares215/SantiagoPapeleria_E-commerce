import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ErpService } from '../../../services/erp/erp.service';

interface Product {
    sku: string;
    erpName: string;
    webName: string;
    brand: string;
    price: number;
    wholesalePrice: number;
    stock: number;
    description: string;
    images: string[];
    weight_kg: number;
    dimensions: { length: number; width: number; height: number };
    allows_custom_message: boolean;
    attributes: { key: string; value: string }[];
    enrichmentStatus: 'pending' | 'draft' | 'complete';
    isVisible: boolean;
    audit_log: Array<{ date: string; admin: string; action: string }>;
    extendedDescription?: string;
}

@Component({
    selector: 'app-product-enrich',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './product-enrich.component.html'
})
export class ProductEnrichComponent implements OnInit {
    sku = signal('');
    isLoading = signal(true);
    formData = signal<Product | null>(null);

    // Advanced Weight Handling (Read Only Display)
    // We don't need signals for editing anymore, but keeping basic props if needed or just use formData directly

    expandedSections = {
        basic: true,
        description: true,
        images: true,
        logistics: true
    };

    showToast = false;
    toastMessage = '';
    toastType: 'success' | 'error' = 'success';
    isSaving = signal(false);
    hasUnsavedChanges = signal(false);

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private erpService: ErpService
    ) { }

    ngOnInit() {
        this.route.params.subscribe(params => {
            const sku = params['sku'];
            if (sku) {
                this.sku.set(sku);
                this.loadProduct(sku);
            }
        });
    }

    loadProduct(sku: string) {
        this.isLoading.set(true);
        this.erpService.getAdminProducts({ searchTerm: sku, limit: 1 }).subscribe({
            next: (res: any) => {
                if (res.data && res.data.length > 0) {
                    const product = res.data[0];
                    console.log('--- DEBUG LOAD PRODUCT RESPONSE ---');
                    console.log('Full Product Object:', product);

                    // Robust mapping for Dimensions (Handle Spanish/English keys)
                    let dSource = product.dimensiones || product.dimensions || {};
                    const dims = {
                        length: dSource.length || dSource.largo || 0,
                        width: dSource.width || dSource.ancho || 0,
                        height: dSource.height || dSource.alto || 0
                    };

                    // Robust mapping for Weight (Backend returns weight_kg)
                    const weight = product.weight_kg || product.peso_kg || product.weight || 0;

                    this.formData.set({
                        sku: product.sku,
                        erpName: product.erpName,
                        webName: product.nombre_web || product.webName || product.erpName,
                        brand: product.brand,
                        price: product.price,
                        wholesalePrice: product.wholesalePrice || 0,
                        stock: product.stock,
                        description: product.descripcion_extendida || product.description || product.erpName,
                        images: product.multimedia ?
                            [product.multimedia.principal, ...(product.multimedia.galeria || [])].filter(Boolean) :
                            (product.images || []),
                        weight_kg: weight,
                        dimensions: dims,
                        allows_custom_message: product.allows_custom_message !== undefined ? product.allows_custom_message : (product.permite_mensaje_personalizado || false),
                        attributes: product.attributes || [],
                        enrichmentStatus: product.enrichment_status || product.enrichmentStatus || 'pending',
                        isVisible: product.es_publico !== undefined ? product.es_publico : (product.isVisible || false),
                        audit_log: [],
                        extendedDescription: product.descripcion_extendida // Keep reference
                    });

                } else {
                    this.showToastNotification('Producto no encontrado', 'error');
                }
                this.isLoading.set(false);
            },
            error: (err: any) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }

    generateSlug(name: string): string {
        return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    get slug(): string {
        const p = this.formData();
        return p ? this.generateSlug(p.webName) : '';
    }

    toggleSection(section: keyof typeof this.expandedSections) {
        this.expandedSections[section] = !this.expandedSections[section];
    }

    updateWebName(name: string) {
        const p = this.formData();
        if (p) {
            this.formData.set({
                ...p,
                webName: name
            });
            this.hasUnsavedChanges.set(true);
        }
    }

    updateDescription(description: string) {
        const p = this.formData();
        if (p) {
            this.formData.set({
                ...p,
                description: description
            });
            this.hasUnsavedChanges.set(true);
        }
    }

    async handleSave() {
        const p = this.formData();
        if (!p) return;

        try {
            this.isSaving.set(true);

            // Payload: Only sending what is allowed to be edited and synced back
            const payload: any = {
                nombre_web: p.webName,
                descripcion_extendida: p.description,
                enrichment_status: 'complete',
            };

            console.log('--- DEBUG SAVE PAYLOAD (RESTRICTED) ---');
            console.log('Payload:', payload);
            console.log('-----------------------------------');

            this.erpService.patchProduct(p.sku, payload)
                .pipe(finalize(() => this.isSaving.set(false)))
                .subscribe({
                    next: () => {
                        this.hasUnsavedChanges.set(false);
                        this.showToastNotification('✅ Cambios guardados exitosamente y sincronizados', 'success');
                    },
                    error: (err: any) => {
                        console.error(err);
                        const msg = err.error?.message || 'Error desconocido';
                        const formattedMsg = Array.isArray(msg) ? msg.join(', ') : msg;
                        this.showToastNotification(`❌ Error al guardar: ${formattedMsg}`, 'error');
                    }
                });

        } catch (error) {
            console.error('Critical Error in handleSave:', error);
            this.showToastNotification('❌ Ocurrió un error inesperado.', 'error');
            this.isSaving.set(false);
        }
    }

    showToastNotification(msg: string, type: 'success' | 'error' = 'success') {
        this.toastMessage = msg;
        this.toastType = type;
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
    }
}
