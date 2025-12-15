import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ErpService } from '../../../../services/erp.service';

interface VariantGroup {
    id: number;
    name: string;
    type: 'color' | 'size' | 'material' | 'custom';
    options: string[];
}

interface Variant {
    id: string;
    combination: Record<string, string>;
    sku: string;
    price_override: number | null;
    stock: number;
    active: boolean;
    images: string[];
}

interface ParentProduct {
    sku: string;
    webName?: string;
    erpName?: string;
    name?: string;
    price: number;
    stock: number;
    has_variants: boolean;
}

// Predefined variant types with suggestions
const PREDEFINED_TYPES: any = {
    color: {
        label: 'Color',
        icon: 'ri-palette-line',
        suggestions: [
            { value: 'Rojo', color: '#EF4444' },
            { value: 'Azul', color: '#3B82F6' },
            { value: 'Verde', color: '#10B981' },
            { value: 'Negro', color: '#000000' },
            { value: 'Blanco', color: '#FFFFFF' },
            { value: 'Amarillo', color: '#F59E0B' },
            { value: 'Rosa', color: '#EC4899' },
            { value: 'Gris', color: '#6B7280' },
            { value: 'Naranja', color: '#F97316' },
            { value: 'Morado', color: '#A855F7' }
        ]
    },
    size: {
        label: 'Tamaño',
        icon: 'ri-ruler-line',
        suggestions: [
            { value: 'XS' },
            { value: 'S' },
            { value: 'M' },
            { value: 'L' },
            { value: 'XL' },
            { value: 'XXL' },
            { value: 'XXXL' }
        ]
    },
    material: {
        label: 'Material',
        icon: 'ri-shirt-line',
        suggestions: [
            { value: 'Algodón' },
            { value: 'Poliéster' },
            { value: 'Lana' },
            { value: 'Seda' },
            { value: 'Lino' },
            { value: 'Cuero' },
            { value: 'Mezclilla' },
            { value: 'Nylon' }
        ]
    },
    custom: {
        label: 'Personalizado',
        icon: 'ri-edit-line',
        suggestions: []
    }
};

@Component({
    selector: 'app-product-variants',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './product-variants.component.html'
})
export class ProductVariantsComponent implements OnInit {
    // Constants
    PREDEFINED_TYPES = PREDEFINED_TYPES;
    // objectKeys = Object.keys; // Removed to use typed getter
    get predefinedTypeKeys() {
        return Object.keys(this.PREDEFINED_TYPES) as Array<'color' | 'size' | 'material' | 'custom'>;
    }

    // State
    parentProduct: ParentProduct | null = null;
    sku: string | null = null;
    groups: VariantGroup[] = [];
    variants: Variant[] = [];

    // UI State
    isGroupModalOpen = false;
    selectedGroupType: 'color' | 'size' | 'material' | 'custom' | null = null;
    newGroupName = '';
    newGroupOptions: string[] = [];
    customOptionInput = '';
    editingGroup: VariantGroup | null = null;

    isImageModalOpen = false;
    selectedVariantForImages: Variant | null = null;
    variantImages: string[] = [];
    useParentImages = false;
    draggedImageIndex: number | null = null;

    showToast = false;
    toastMessage = '';
    toastType: 'success' | 'error' = 'success';

    showConfirmModal = false;
    confirmMessage = '';
    confirmAction: () => void = () => { };

    hasUnsavedChanges = false;
    isSaving = false;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private erpService: ErpService
    ) { }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.sku = params['sku'];
            if (this.sku) {
                this.loadProduct(this.sku);
            } else {
                this.showToastMessage('⚠️ Acceso inválido. Redirigiendo...', 'error');
                setTimeout(() => this.router.navigate(['/admin/products']), 2000);
            }
        });

        // Handle before unload
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    loadProduct(sku: string) {
        this.erpService.getAdminProducts({ searchTerm: sku, limit: 1 }).subscribe({
            next: (res: any) => {
                if (res.data && res.data.length > 0) {
                    const p = res.data[0];
                    this.parentProduct = {
                        sku: p.sku,
                        webName: p.webName,
                        erpName: p.erpName,
                        price: p.price,
                        stock: p.stock,
                        has_variants: p._enrichedData?.has_variants || false
                    };

                    // Load existing variants from enriched data
                    if (p._enrichedData?.grupos_variantes) {
                        this.groups = p._enrichedData.grupos_variantes.map((g: any) => ({
                            id: Number(g.id), // Ensure type match
                            name: g.nombre,
                            type: g.tipo,
                            options: g.opciones
                        }));
                    }

                    if (p._enrichedData?.variantes) {
                        this.variants = p._enrichedData.variantes.map((v: any) => ({
                            id: v.id,
                            combination: v.combinacion,
                            sku: v.sku,
                            price_override: v.precio_especifico,
                            stock: v.stock,
                            active: v.activo,
                            images: v.imagenes
                        }));
                    }
                } else {
                    this.showToastMessage('Producto no encontrado', 'error');
                }
            },
            error: (err) => console.error(err)
        });
    }

    // Group Management
    openGroupModal(group?: VariantGroup) {
        if (group) {
            this.editingGroup = group;
            this.selectedGroupType = group.type;
            this.newGroupName = group.name;
            this.newGroupOptions = [...group.options];
        } else {
            this.editingGroup = null;
            this.selectedGroupType = null;
            this.newGroupName = '';
            this.newGroupOptions = [];
        }
        this.customOptionInput = '';
        this.isGroupModalOpen = true;
    }

    closeGroupModal() {
        this.isGroupModalOpen = false;
        this.selectedGroupType = null;
        this.newGroupName = '';
        this.newGroupOptions = [];
        this.customOptionInput = '';
        this.editingGroup = null;
    }

    handleGroupTypeSelect(type: 'color' | 'size' | 'material' | 'custom') {
        this.selectedGroupType = type;
        if (type !== 'custom') {
            this.newGroupName = this.PREDEFINED_TYPES[type].label;
        } else {
            this.newGroupName = '';
        }
        this.newGroupOptions = [];
    }

    toggleSuggestedOption(option: string) {
        if (this.newGroupOptions.includes(option)) {
            this.newGroupOptions = this.newGroupOptions.filter(o => o !== option);
        } else {
            this.newGroupOptions.push(option);
        }
    }

    addCustomOption() {
        const trimmed = this.customOptionInput.trim();
        if (trimmed && !this.newGroupOptions.includes(trimmed)) {
            this.newGroupOptions.push(trimmed);
            this.customOptionInput = '';
        }
    }

    removeOption(optionToRemove: string) {
        this.newGroupOptions = this.newGroupOptions.filter(o => o !== optionToRemove);
    }

    handleSaveGroup() {
        if (!this.selectedGroupType) {
            alert('⚠️ Selecciona un tipo de variante');
            return;
        }
        if (this.selectedGroupType === 'custom' && !this.newGroupName.trim()) {
            alert('⚠️ Ingresa un nombre para el grupo personalizado');
            return;
        }
        if (this.newGroupOptions.length < 2) {
            alert('⚠️ Debes seleccionar al menos 2 opciones');
            return;
        }

        if (this.editingGroup) {
            this.groups = this.groups.map(g =>
                g.id === this.editingGroup!.id
                    ? { ...g, name: this.newGroupName, type: this.selectedGroupType!, options: this.newGroupOptions }
                    : g
            );
            this.hasUnsavedChanges = true;
        } else {
            if (this.groups.length >= 3) {
                alert('⚠️ Máximo 3 grupos de variantes permitidos');
                return;
            }
            const newGroup: VariantGroup = {
                id: Date.now(),
                name: this.newGroupName,
                type: this.selectedGroupType,
                options: this.newGroupOptions
            };
            this.groups.push(newGroup);
            this.hasUnsavedChanges = true;
        }
        this.closeGroupModal();
    }

    handleDeleteGroup(groupId: number) {
        this.confirmMessage = '¿Eliminar este grupo? Esto eliminará todas las variantes generadas.';
        this.confirmAction = () => {
            this.groups = this.groups.filter(g => g.id !== groupId);
            this.variants = [];
            this.showToastMessage('Grupo eliminado', 'success');
            this.hasUnsavedChanges = true;
            this.showConfirmModal = false;
        };
        this.showConfirmModal = true;
    }

    // Variants Generator
    generateVariants() {
        if (this.variants.length > 0) {
            this.confirmMessage = '¿Regenerar variantes? Esto eliminará las variantes existentes y sus configuraciones.';
            this.confirmAction = () => {
                this.performGenerateVariants();
                this.showConfirmModal = false;
            };
            this.showConfirmModal = true;
        } else {
            this.performGenerateVariants();
        }
    }

    performGenerateVariants() {
        if (!this.parentProduct) return;
        if (this.groups.length === 0) {
            this.showToastMessage('⚠️ Debes crear al menos un grupo de variantes', 'error');
            return;
        }

        const combinations: Record<string, string>[] = [];
        const generateCombinations = (index: number, current: Record<string, string>) => {
            if (index === this.groups.length) {
                combinations.push({ ...current });
                return;
            }
            const group = this.groups[index];
            group.options.forEach(option => {
                current[group.name] = option;
                generateCombinations(index + 1, { ...current }); // Copy current to prevent mutation issues
            });
        };

        generateCombinations(0, {});

        this.variants = combinations.map((combo, idx) => {
            const skuSuffix = Object.values(combo)
                .map(v => v.charAt(0).toUpperCase())
                .join('-');

            return {
                id: `var-${Date.now()}-${idx}`,
                combination: combo,
                sku: `${this.parentProduct!.sku}-${skuSuffix}`,
                price_override: null,
                stock: 0,
                active: true,
                images: []
            };
        });

        this.showToastMessage(`✅ ${this.variants.length} variantes generadas exitosamente`, 'success');
        this.hasUnsavedChanges = true;
    }

    // Variant Management
    updateVariant(variantId: string, field: keyof Variant, value: any) {
        this.variants = this.variants.map(v =>
            v.id === variantId ? { ...v, [field]: value } : v
        );
        this.hasUnsavedChanges = true;
    }

    toggleVariantActive(variantId: string) {
        const v = this.variants.find(v => v.id === variantId);
        if (v) {
            this.updateVariant(variantId, 'active', !v.active);
        }
    }

    handleDeleteVariant(variantId: string) {
        this.confirmMessage = '¿Eliminar esta variante?';
        this.confirmAction = () => {
            this.variants = this.variants.filter(v => v.id !== variantId);
            this.showToastMessage('Variante eliminada', 'success');
            this.hasUnsavedChanges = true;
            this.showConfirmModal = false;
        };
        this.showConfirmModal = true;
    }

    // Images Logic
    openImageModal(variant: Variant) {
        this.selectedVariantForImages = variant;
        this.variantImages = [...variant.images];
        this.useParentImages = variant.images.length === 0;
        this.isImageModalOpen = true;
    }

    closeImageModal() {
        this.isImageModalOpen = false;
        this.selectedVariantForImages = null;
        this.variantImages = [];
    }

    handleImageUpload() {
        if (this.variantImages.length >= 8) {
            this.showToastMessage('Máximo 8 imágenes por variante', 'error');
            return;
        }
        const fileInput = document.getElementById('variantImageUpload') as HTMLInputElement;
        if (fileInput) {
            fileInput.click();
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        // Reset input value
        event.target.value = '';
        this.showToastMessage('Subiendo imagen...', 'success');

        this.erpService.uploadImage(file).subscribe({
            next: (res: any) => {
                this.variantImages.push(res.url);
                this.showToastMessage('✅ Imagen subida');
            },
            error: (err) => {
                console.error(err);
                this.showToastMessage('❌ Error al subir imagen', 'error');
            }
        });
    }

    handleDeleteImage(index: number) {
        this.variantImages.splice(index, 1);
    }

    handleSaveImages() {
        if (this.selectedVariantForImages) {
            this.updateVariant(this.selectedVariantForImages.id, 'images', this.useParentImages ? [] : [...this.variantImages]);
            this.showToastMessage('Imágenes actualizadas', 'success');
            this.closeImageModal();
        }
    }

    // Save Logic
    handleSave() {
        if (!this.parentProduct) return;

        // 1. Validation
        // Negative checks
        const hasNegatives = this.variants.some(v => v.stock < 0 || (v.price_override !== null && v.price_override < 0));
        if (hasNegatives) {
            this.showToastMessage('❌ No se permiten stocks o precios negativos', 'error');
            return;
        }

        // Master Stock Logic
        // TODO: This logic depends on business rule using 'master stock' as the limit or sum total. 
        // Assuming we want to warn if sum of variants > parent stock, but allowed to proceed?
        // Prompt says: "Total Variant Stock cannot exceed ERP Product Stock. Display a warning if it does."
        // If strict, we return. Let's make it strict or just warn. User said "Display a warning". 
        // But preventing negative is strict.

        const totalVariantStock = this.variants.reduce((acc, v) => acc + (v.active ? Number(v.stock) : 0), 0);
        // Assuming we can access parent stock from parentProduct (it was mapped in loadProduct)
        // Check if parentProduct has stock property populated correctly. Yes in interface.
        /* 
           NOTE: If implementation requires STRICT blocking:
           if (totalVariantStock > (this.parentProduct?.stock || 0)) { ... return; }
           User prompt said: "Total Variant Stock cannot exceed ERP Product Stock." -> Sounds strict.
           "Display a warning if it does." -> Sounds non-blocking?
           I will block to be safe for "Integrity".
        */
        if (this.parentProduct.stock !== undefined && totalVariantStock > this.parentProduct.stock) {
            // Let's allow it but show Toast? Or Block? 
            // "Strict Data Validation" suggests blocking. 
            // But "Display a warning" suggests Toast.
            // I'll block to ensure integrity.
            this.showToastMessage(`❌ El stock total (${totalVariantStock}) excede el stock del producto padre (${this.parentProduct.stock})`, 'error');
            return;
        }


        this.isSaving = true;

        // Backend expects snake_case for some fields based on schema, but let's check payload structure
        // We are sending this to patchProduct. keys should match schema `grupos_variantes`, `variantes`

        const payload = {
            grupos_variantes: this.groups.map(g => ({
                id: g.id.toString(), // Schema expects string
                nombre: g.name,
                tipo: g.type,
                opciones: g.options
            })),
            variantes: this.variants.map(v => ({
                id: v.id,
                combinacion: v.combination,
                sku: v.sku,
                precio_especifico: v.price_override,
                stock: v.stock,
                activo: v.active,
                imagenes: v.images
            })),
            tiene_variantes: true,

            // Also update summary in variantsSummary field if we want to read it easily in enrichment
            variantsSummary: {
                totalVariants: this.variants.length,
                groups: this.groups.map(g => ({ name: g.name, optionsCount: g.options.length })),
                lastUpdated: new Date().toISOString()
            }
        };

        this.erpService.patchProduct(this.parentProduct.sku, payload)
            .pipe(finalize(() => this.isSaving = false))
            .subscribe({
                next: () => {
                    this.hasUnsavedChanges = false;
                    this.showToastMessage('✅ Variantes guardadas exitosamente');
                },
                error: (err) => {
                    console.error(err);
                    const msg = err.error?.message || 'Error desconocido';
                    this.showToastMessage(`❌ Error al guardar: ${typeof msg === 'object' ? msg.join(', ') : msg}`, 'error');
                }
            });
    }

    handleBack() {
        if (this.hasUnsavedChanges) {
            if (confirm('¿Estás seguro de salir sin guardar?')) {
                this.router.navigate(['/admin/products/enrich', this.sku]);
            }
        } else {
            this.router.navigate(['/admin/products/enrich', this.sku]);
        }
    }

    // Helpers
    showToastMessage(msg: string, type: 'success' | 'error' = 'success') {
        this.toastMessage = msg;
        this.toastType = type;
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
    }

    getCombinationLabel(combo: Record<string, string>): string {
        return Object.values(combo).join(' / ');
    }
}
