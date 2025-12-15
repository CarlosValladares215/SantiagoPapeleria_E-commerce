import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ErpService } from '../../../../services/erp.service';

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
    has_variants: boolean;
    enrichmentStatus: 'pending' | 'draft' | 'complete';
    isVisible: boolean;
    audit_log: Array<{ date: string; admin: string; action: string }>;
    variantsSummary?: {
        totalVariants: number;
        groups: Array<{ name: string; optionsCount: number }>;
        lastUpdated: string;
    };
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

    expandedSections = {
        basic: true,
        description: true,
        images: true,
        logistics: true
    };

    showImageUpload = false;
    uploadProgress = 0;
    showToast = false;
    toastMessage = '';
    draggedIndex: number | null = null;
    isSaving = false;
    hasUnsavedChanges = false;

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
        // Call backend via the Grid/Search endpoint or individual findOne
        // We know 'findOne' exists in backend, so we try that via service?
        // Note: erpService needs findOne, or use getAdminProducts({ searchTerm: sku }) and pick first? 
        // Using getAdminProducts for now as 'findOne' might return public DTO only.

        // Actually, we need to add findOne to ErpService or reusable method
        // For now, let's use getAdminProducts filtering by SKU, since that endpoint returns merged data.

        this.erpService.getAdminProducts({ searchTerm: sku, limit: 1 }).subscribe({
            next: (res: any) => {
                if (res.data && res.data.length > 0) {
                    const product = res.data[0];
                    // Map generic merged product to local Product interface
                    this.formData.set({
                        sku: product.sku,
                        erpName: product.erpName,
                        webName: product.webName || product.erpName, // Default to ERP name if empty
                        brand: product.brand,
                        price: product.price,
                        wholesalePrice: product.wholesalePrice || 0,
                        stock: product.stock,
                        description: product._enrichedData?.description || product.erpName,
                        images: product._enrichedData?.images || ['https://via.placeholder.com/400'], // Default placeholder
                        weight_kg: product._enrichedData?.weight_kg || 0,
                        dimensions: product._enrichedData?.dimensions || { length: 0, width: 0, height: 0 },
                        allows_custom_message: product._enrichedData?.allows_custom_message || false,
                        has_variants: product._enrichedData?.has_variants || false,
                        variantsSummary: product._enrichedData?.variantsSummary,
                        enrichmentStatus: product.enrichmentStatus,
                        isVisible: product.isVisible,
                        audit_log: []
                    });
                } else {
                    // Handle not found
                    this.showToastNotification('Producto no encontrado');
                }
                this.isLoading.set(false);
            },
            error: (err) => {
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

    handleImageUpload() {
        const fileInput = document.getElementById('productImageUpload') as HTMLInputElement;
        if (fileInput) {
            fileInput.click();
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        // Reset input value to allow selecting same file again
        event.target.value = '';

        this.showToastNotification('Subiendo imagen...');

        this.erpService.uploadImage(file).subscribe({
            next: (res: any) => {
                const p = this.formData();
                if (p) {
                    const newImages = [...p.images, res.url];
                    this.formData.set({ ...p, images: newImages });
                    this.hasUnsavedChanges = true;
                    this.showToastNotification('✅ Imagen subida exitosamente');
                }
            },
            error: (err) => {
                console.error(err);
                this.showToastNotification('❌ Error al subir imagen');
            }
        });
    }

    handleDeleteImage(index: number) {
        const p = this.formData();
        if (p) {
            const newImages = [...p.images];
            newImages.splice(index, 1);
            this.formData.set({ ...p, images: newImages });
            this.hasUnsavedChanges = true;
        }
    }

    async handleSave() {
        const p = this.formData();
        if (!p) return;

        // 1. Strict Validation
        if (p.weight_kg < 0 || p.dimensions.length < 0 || p.dimensions.width < 0 || p.dimensions.height < 0) {
            this.showToastNotification('❌ No se permiten valores negativos en peso o dimensiones');
            return;
        }

        this.isSaving = true;

        // Prepare payload for patch
        // Map back to what backend expects in 'enrichProduct'
        const payload = {
            nombre_web: p.webName,
            description: p.description,
            images: p.images,
            es_publico: p.isVisible,
            peso_kg: p.weight_kg,
            dimensiones: p.dimensions,
            allows_custom_message: p.allows_custom_message,
            has_variants: p.has_variants,
            enrichment_status: 'complete'
        };

        this.erpService.patchProduct(p.sku, payload)
            .pipe(finalize(() => this.isSaving = false)) // Always reset flag
            .subscribe({
                next: () => {
                    this.hasUnsavedChanges = false;
                    this.showToastNotification('✅ Producto guardado exitosamente');
                },
                error: (err) => {
                    console.error(err);
                    const msg = err.error?.message || 'Error desconocido';
                    this.showToastNotification(`❌ Error al guardar: ${typeof msg === 'object' ? msg.join(', ') : msg}`);
                }
            });
    }

    showToastNotification(msg: string) {
        this.toastMessage = msg;
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
    }

    navigateToVariants() {
        const p = this.formData();
        if (p) {
            this.router.navigate(['/admin/products/variants'], { queryParams: { sku: p.sku } });
        }
    }
}
