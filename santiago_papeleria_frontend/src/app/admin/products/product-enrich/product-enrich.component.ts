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

    // Advanced Weight Handling
    weightUnit = signal<'kg' | 'g'>('kg');
    displayedWeight = signal<string>(''); // Holds raw string input allows comma/dot

    // Dimension Handling
    displayedDimensions = signal({ length: '', width: '', height: '' });

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
    toastType: 'success' | 'error' = 'success';
    draggedIndex: number | null = null;
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
                    console.log('--- DEBUG LOAD PRODUCT RESPONSE ---');
                    console.log('Full Product Object:', product);
                    console.log('Weight (peso_kg):', product.peso_kg, 'Weight (weight):', product.weight);
                    console.log('Dimensions (dimensiones):', product.dimensiones, 'Dimensions (dimensions):', product.dimensions);
                    console.log('Attributes:', product.attributes);
                    console.log('-----------------------------------');

                    // Map generic merged product to local Product interface
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
                        // Backend returns allows_custom_message
                        allows_custom_message: product.allows_custom_message !== undefined ? product.allows_custom_message : (product.permite_mensaje_personalizado || false),
                        attributes: product.attributes || [],
                        enrichmentStatus: product.enrichment_status || product.enrichmentStatus || 'pending',
                        isVisible: product.es_publico !== undefined ? product.es_publico : (product.isVisible || false),
                        audit_log: [],
                        extendedDescription: product.descripcion_extendida // Keep reference
                    });

                    // Init displayed weight
                    const w = this.formData()?.weight_kg || 0;
                    this.displayedWeight.set(w > 0 ? w.toString() : '');
                    this.weightUnit.set('kg'); // Default to kg on load

                    // Init displayed dimensions
                    const d = this.formData()?.dimensions;
                    this.displayedDimensions.set({
                        length: d?.length ? d.length.toString() : '',
                        width: d?.width ? d.width.toString() : '',
                        height: d?.height ? d.height.toString() : ''
                    });

                } else {
                    // Handle not found
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

    // UX Helpers
    get validSpecsCount(): number {
        const p = this.formData();
        return p?.attributes ? p.attributes.filter(a => a.key && a.value).length : 0;
    }

    get isCustomMsgActive(): boolean {
        return this.formData()?.allows_custom_message || false;
    }

    get hasLogisticsConfig(): boolean {
        const p = this.formData();
        if (!p) return false;
        // Check if weight > 0 OR any dimension > 0
        const w = p.weight_kg || 0;
        const d = p.dimensions;
        return w > 0 || (d && (d.length > 0 || d.width > 0 || d.height > 0));
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

    toggleCustomMessage() {
        const p = this.formData();
        if (p) {
            this.formData.set({
                ...p,
                allows_custom_message: !p.allows_custom_message
            });
            this.hasUnsavedChanges.set(true);
        }
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
                    this.hasUnsavedChanges.set(true);
                    this.showToastNotification('✅ Imagen subida exitosamente');
                }
            },
            error: (err: any) => {
                console.error(err);
                this.showToastNotification('❌ Error al subir imagen', 'error');
            }
        });
    }

    handleDeleteImage(index: number) {
        const p = this.formData();
        if (p) {
            const newImages = [...p.images];
            newImages.splice(index, 1);
            this.formData.set({ ...p, images: newImages });
            this.hasUnsavedChanges.set(true);
        }
    }

    async handleSave() {
        // 1. Sync Dimensions first to ensure "displayed" inputs are captured into the signal
        this.updateDimensionsFromDisplay();

        // 2. Parse and sync Weight from Display into the signal
        // This ensures that what the user sees is what we validate
        const wVal = this.displayedWeight();
        const weightNum = this.parseWeight(wVal);
        const pRef = this.formData();

        // Update signal with latest weight BEFORE validation
        if (pRef) {
            this.formData.set({ ...pRef, weight_kg: weightNum });
        }

        // 3. Re-fetch fresh signal state
        const p = this.formData();
        if (!p) return;

        // 4. Calculate Final Weight in KG for Logic
        let finalWeight = weightNum;
        if (this.weightUnit() === 'g') {
            finalWeight = finalWeight / 1000;
        }
        // Round to 3 decimals
        finalWeight = Math.round(finalWeight * 1000) / 1000;

        // 5. Strict Business Validation
        // Requirement: Weight MUST be > 0 to save ANY enrichment.
        if (finalWeight <= 0) {
            this.showToastNotification('❌ El peso debe ser mayor a 0 (mínimo 1g) para guardar cambios.', 'error');
            return;
        }
        if (finalWeight > 500) {
            this.showToastNotification('❌ El peso excede el límite permitido de 500kg', 'error');
            return;
        }

        // 6. Pre-validation checks for Dimensions
        if (p.dimensions.length < 0 || p.dimensions.width < 0 || p.dimensions.height < 0) {
            this.showToastNotification('❌ Las dimensiones no pueden ser negativas', 'error');
            return;
        }

        try {
            this.isSaving.set(true);

            // 7. Payload Construction (Strict Source of Truth: formData + calculated finalWeight)
            const validAttributes = p.attributes
                .filter(a => a.key.trim() !== '' && a.value.trim() !== '')
                .map(a => ({ key: a.key, value: a.value }));

            const payload: any = {
                nombre_web: p.webName,
                descripcion_extendida: p.description,
                multimedia: {
                    principal: p.images.length > 0 ? p.images[0] : '',
                    galeria: p.images.length > 1 ? p.images.slice(1) : []
                },
                es_publico: p.isVisible,
                // Strict: Always send calculated KG value
                peso_kg: finalWeight,
                dimensiones: {
                    largo: p.dimensions.length || 0,
                    ancho: p.dimensions.width || 0,
                    alto: p.dimensions.height || 0
                },
                // Independent persistence: strictly from signal
                permite_mensaje_personalizado: p.allows_custom_message,
                attributes: validAttributes,
                enrichment_status: 'complete',
            };

            console.log('--- DEBUG SAVE PAYLOAD (STRICT) ---');
            console.log('Weight (KG):', payload.peso_kg);
            console.log('Custom Message:', payload.permite_mensaje_personalizado);
            console.log('-----------------------------------');

            this.erpService.patchProduct(p.sku, payload)
                .pipe(finalize(() => this.isSaving.set(false)))
                .subscribe({
                    next: () => {
                        this.hasUnsavedChanges.set(false);
                        this.showToastNotification('✅ Cambios guardados exitosamente', 'success');
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

    // Variant navigation removed


    // --- Input Hardening Helpers ---

    preventInvalidChars(event: KeyboardEvent) {
        if (['e', 'E', '-', '+'].includes(event.key)) {
            event.preventDefault();
        }
    }

    get weightInputMaxLength(): number {
        // 500kg = "500.000" (7 chars). We allow a bit more for editing comfort (e.g. 10).
        // 500kg in g = "500000" (6 chars). We allow 8.
        return this.weightUnit() === 'kg' ? 10 : 8;
    }

    // --- Advanced Input Handling ---

    parseWeight(val: string): number {
        if (!val) return 0;
        // Normalize comma to dot
        const normalized = val.replace(/,/g, '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    }

    onWeightInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const val = input.value;
        this.displayedWeight.set(val);
        this.hasUnsavedChanges.set(true);
    }

    onWeightBlur() {
        let val = this.displayedWeight();
        if (!val) return;

        // Cleanup: replace comma with dot, remove multiple dots
        val = val.replace(/,/g, '.');

        // Remove any non-numeric chars that might have slipped in (except dot)
        // This is a safety catch, though keydown/paste should prevent most
        val = val.replace(/[^0-9.]/g, '');

        // Fix multiple dots: keep only first one
        const parts = val.split('.');
        if (parts.length > 2) {
            val = parts[0] + '.' + parts.slice(1).join('');
        }

        this.displayedWeight.set(val);

        // Sync with formData to ensure consistency
        const p = this.formData();
        if (p) {
            const numVal = parseFloat(val);
            this.formData.set({
                ...p,
                weight_kg: isNaN(numVal) ? 0 : numVal
            });
        }
    }

    onWeightKeydown(event: KeyboardEvent) {
        const allowed = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter', '.', ','];

        // 1. Check for letters specifically to show the helpful message
        if (/^[a-zA-Z]$/.test(event.key)) {
            event.preventDefault();
            this.showToastNotification('⚠️ Por favor seleccione gramos o kilogramos usando el selector de unidad.', 'error');
            return;
        }

        // 2. Allow control keys
        if (allowed.includes(event.key) || event.ctrlKey || event.metaKey) {
            // Prevent multiple separators
            if ((event.key === '.' || event.key === ',') &&
                (this.displayedWeight().includes('.') || this.displayedWeight().includes(','))) {
                event.preventDefault();
            }
            return;
        }

        // 3. Allow numbers
        if (/^[0-9]$/.test(event.key)) {
            return;
        }

        // 4. Block everything else
        event.preventDefault();
    }

    onWeightPaste(event: ClipboardEvent) {
        event.preventDefault();
        const clipboardData = event.clipboardData || (window as any).clipboardData;
        const pastedText = clipboardData.getData('text');

        // Check if pasted text contains letters to show warning
        if (/[a-zA-Z]/.test(pastedText)) {
            this.showToastNotification('⚠️ Por favor seleccione gramos o kilogramos usando el selector de unidad.', 'error');
        }

        // Strip non-numeric/dot/comma characters
        let cleanText = pastedText.replace(/[^0-9.,]/g, '');

        // Normalize comma to dot
        cleanText = cleanText.replace(/,/g, '.');

        // Insert at cursor position or replace selection (simplified: just append or replace value for now, 
        // to implement full caret support is complex without direct ElementRef, 
        // but standard behavior is usually replacing content or inserting. 
        // Let's just update the signal which updates the simple input)
        // Better UX: simulate insertion.
        // For simplicity and robustness: just set the value to the cleaned text if it's a full replace, 
        // or append? 
        // standard input paste behavior is hard to replicate perfectly. 
        // Let's try to just insert clean text.

        // actually simplest: just allow the paste to happen natively THEN clean it up? 
        // No, we prevented default.
        // Let's just set the text to the cleaned version if it's valid.

        if (cleanText) {
            const input = event.target as HTMLInputElement;
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const currentVal = input.value;

            const newVal = currentVal.substring(0, start) + cleanText + currentVal.substring(end);
            this.displayedWeight.set(newVal);
            this.hasUnsavedChanges.set(true);
        }
    }

    // --- Dimension Input Handling ---

    updateDimensionsFromDisplay() {
        const currentRef = this.formData();
        if (!currentRef) return;

        const d = this.displayedDimensions();
        const parseDim = (val: string) => {
            if (!val) return 0;
            const clean = val.replace(/,/g, '.').replace(/[^0-9.]/g, '');
            const num = parseFloat(clean);
            return isNaN(num) ? 0 : num;
        };

        const newDims = {
            length: parseDim(d.length),
            width: parseDim(d.width),
            height: parseDim(d.height)
        };

        this.formData.set({
            ...currentRef,
            dimensions: newDims
        });
    }

    onDimensionInput(field: 'length' | 'width' | 'height', event: Event) {
        const input = event.target as HTMLInputElement;
        const val = input.value;

        const current = this.displayedDimensions();
        this.displayedDimensions.set({ ...current, [field]: val });
        this.hasUnsavedChanges.set(true);
    }

    onDimensionBlur(field: 'length' | 'width' | 'height') {
        const current = this.displayedDimensions();
        let val = current[field];

        if (!val) {
            // If empty, set to 0 in main model? Or keep empty? 
            // Requirement: "Realistic range". Empty usually 0.
            // Let's set to 0.
            const p = this.formData();
            if (p) {
                this.formData.set({
                    ...p,
                    dimensions: { ...p.dimensions, [field]: 0 }
                });
            }
            return;
        }

        // Normalize
        val = val.replace(/,/g, '.');
        val = val.replace(/[^0-9.]/g, ''); // Remove bad chars

        // Fix multiple dots
        const parts = val.split('.');
        if (parts.length > 2) {
            val = parts[0] + '.' + parts.slice(1).join('');
        }

        let num = parseFloat(val);
        if (isNaN(num) || num < 0) num = 0;

        // Validation Range (0 - 1000 cm)
        if (num > 1000) {
            this.showToastNotification(`⚠️ Dimensión ajustada: Máximo permitido 1000 cm.`, 'error');
            num = 1000;
        }

        // Round to 2 decimals
        num = Math.round(num * 100) / 100;

        // Update display with clean string
        this.displayedDimensions.set({ ...current, [field]: num.toString() });

        // Update real model
        const p = this.formData();
        if (p) {
            this.formData.set({
                ...p,
                dimensions: { ...p.dimensions, [field]: num }
            });
        }
    }

    onDimensionKeydown(event: KeyboardEvent) {
        const allowed = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter', '.', ','];

        // Block letters
        if (/^[a-zA-Z]$/.test(event.key)) {
            event.preventDefault();
            this.showToastNotification('⚠️ Solo valores numéricos (cm).', 'error');
            return;
        }

        if (allowed.includes(event.key) || event.ctrlKey || event.metaKey) return;

        if (/^[0-9]$/.test(event.key)) return;

        event.preventDefault();
    }

    // --- Attributes / Tags Management ---

    addAttribute() {
        const p = this.formData();
        if (p) {
            // Check for empty attributes to prevent spamming empty rows
            if (p.attributes.some(a => !a.key.trim() || !a.value.trim())) {
                this.showToastNotification('⚠️ Completa los atributos existentes antes de agregar uno nuevo.', 'error');
                return;
            }

            const newAttributes = [...p.attributes, { key: '', value: '' }];
            this.formData.set({ ...p, attributes: newAttributes });
            this.hasUnsavedChanges.set(true);
        }
    }

    removeAttribute(index: number) {
        const p = this.formData();
        if (p) {
            const newAttributes = [...p.attributes];
            newAttributes.splice(index, 1);
            this.formData.set({ ...p, attributes: newAttributes });
            this.hasUnsavedChanges.set(true);
        }
    }

    updateAttribute(index: number, field: 'key' | 'value', event: Event) {
        const input = event.target as HTMLInputElement;
        const val = input.value;
        const p = this.formData();
        if (p) {
            const newAttributes = [...p.attributes];
            newAttributes[index] = { ...newAttributes[index], [field]: val };
            this.formData.set({ ...p, attributes: newAttributes });
            this.hasUnsavedChanges.set(true);
        }
    }
}
