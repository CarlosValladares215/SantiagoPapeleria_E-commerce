import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PromocionesService } from '../../../services/promociones.service';
import { ProductService } from '../../../services/product/product.service';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
    selector: 'app-promocion-form',
    templateUrl: './promocion-form.component.html',
    standalone: false
})
export class PromocionFormComponent implements OnInit {
    form: FormGroup;
    isEdit = false;
    promotionId: string | null = null;
    loading = false;

    // Categories & Brands Data (for dropdowns)
    categoryStructure: any[] = [];
    allGroups: string[] = []; // Flat list of all group names for search
    brands: string[] = [];

    // Multi-Select State
    selectedCategories: string[] = [];
    selectedBrands: string[] = [];
    selectedProducts: any[] = [];

    // Search Controls
    searchControl = new FormControl('');
    searchResults: any[] = [];
    isSearching = false;

    constructor(
        private fb: FormBuilder,
        private promocionesService: PromocionesService,
        private productService: ProductService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {
        this.form = this.fb.group({
            nombre: ['', [Validators.required, Validators.minLength(3)]],
            descripcion: [''],
            tipo: ['porcentaje', Validators.required],
            valor: [0, [Validators.required, Validators.min(0.01)]],
            ambito: ['global', Validators.required],
            filtro: this.fb.group({
                categorias: [[]],
                marcas: [[]],
                codigos_productos: [[]]
            }),
            fecha_inicio: ['', Validators.required],
            fecha_fin: ['', Validators.required],
            activa: [true]
        });

        this.setupProductSearch();
    }

    ngOnInit(): void {
        this.loadCategories();
        this.loadBrands();
        this.promotionId = this.route.snapshot.paramMap.get('id');
        if (this.promotionId) {
            this.isEdit = true;
            this.loadPromotion(this.promotionId);
        }
    }

    setupProductSearch() {
        this.searchControl.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap((term: string | null) => {
                if (!term || term.length < 2) {
                    this.searchResults = [];
                    this.cdr.detectChanges();
                    return of({ data: [] });
                }
                this.isSearching = true;
                this.cdr.detectChanges();
                return this.productService.searchAdminProducts(term).pipe(
                    catchError(() => {
                        this.isSearching = false;
                        this.cdr.detectChanges();
                        return of({ data: [] });
                    })
                );
            })
        ).subscribe((res: any) => {
            this.searchResults = res.data || [];
            this.isSearching = false;
            this.cdr.detectChanges();
        });
    }

    // === Multi-Select: Categories ===
    addCategory(category: string) {
        if (category && !this.selectedCategories.includes(category)) {
            this.selectedCategories.push(category);
            this.syncFiltro();
        }
    }

    removeCategory(index: number) {
        this.selectedCategories.splice(index, 1);
        this.syncFiltro();
    }

    // === Multi-Select: Brands ===
    addBrand(brand: string) {
        if (brand && !this.selectedBrands.includes(brand)) {
            this.selectedBrands.push(brand);
            this.syncFiltro();
        }
    }

    removeBrand(index: number) {
        this.selectedBrands.splice(index, 1);
        this.syncFiltro();
    }

    // === Multi-Select: Products ===
    addProduct(product: any) {
        if (!this.selectedProducts.find(p => p.codigo_interno === product.codigo_interno)) {
            this.selectedProducts.push(product);
            this.syncFiltro();
        }
        this.searchControl.setValue('');
        this.searchResults = [];
    }

    removeProduct(index: number) {
        this.selectedProducts.splice(index, 1);
        this.syncFiltro();
    }

    handleSearchEnter(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.searchResults.length > 0) {
            this.addProduct(this.searchResults[0]);
        }
    }

    // Sync all selections to form
    syncFiltro() {
        const categorias = [...this.selectedCategories];
        const marcas = [...this.selectedBrands];
        const codigos_productos = this.selectedProducts.map(p => p.codigo_interno);

        this.form.get('filtro.categorias')?.setValue(categorias);
        this.form.get('filtro.marcas')?.setValue(marcas);
        this.form.get('filtro.codigos_productos')?.setValue(codigos_productos);

        // Auto-determine ambito based on what's selected
        this.updateAmbito();
    }

    updateAmbito() {
        const hasCat = this.selectedCategories.length > 0;
        const hasBrand = this.selectedBrands.length > 0;
        const hasProd = this.selectedProducts.length > 0;

        if (!hasCat && !hasBrand && !hasProd) {
            this.form.get('ambito')?.setValue('global');
        } else if (hasCat && !hasBrand && !hasProd) {
            this.form.get('ambito')?.setValue('categoria');
        } else if (!hasCat && hasBrand && !hasProd) {
            this.form.get('ambito')?.setValue('marca');
        } else if (!hasCat && !hasBrand && hasProd) {
            this.form.get('ambito')?.setValue('productos');
        } else {
            this.form.get('ambito')?.setValue('mixto');
        }
    }

    loadCategories() {
        this.productService.fetchCategoriesStructure().subscribe({
            next: (data: any) => {
                this.categoryStructure = data;
                // Extract flat list of all group names for selection
                this.allGroups = [];
                data.forEach((line: any) => {
                    if (line.grupos) {
                        line.grupos.forEach((g: any) => {
                            if (g.nombre && !this.allGroups.includes(g.nombre)) {
                                this.allGroups.push(g.nombre);
                            }
                        });
                    }
                });
                this.allGroups.sort();
            },
            error: (err: any) => console.error('Error loading categories:', err)
        });
    }

    loadBrands() {
        this.productService.fetchBrands().subscribe({
            next: (data: any) => this.brands = data.sort(),
            error: (err: any) => console.error('Error loading brands:', err)
        });
    }

    loadPromotion(id: string) {
        this.loading = true;
        this.promocionesService.getById(id).subscribe({
            next: (promo: any) => {
                // Convert dates to YYYY-MM-DD format for form patchValue safely
                let startDate = '';
                let endDate = '';
                try {
                    if (promo.fecha_inicio) {
                        const d = new Date(promo.fecha_inicio);
                        if (!isNaN(d.getTime())) {
                            startDate = d.toISOString().split('T')[0];
                        }
                    }
                    if (promo.fecha_fin) {
                        const d = new Date(promo.fecha_fin);
                        if (!isNaN(d.getTime())) {
                            endDate = d.toISOString().split('T')[0];
                        }
                    }
                } catch (e) {
                    console.error('Error parsing dates:', e);
                }

                this.form.patchValue({
                    ...promo,
                    fecha_inicio: startDate,
                    fecha_fin: endDate
                });

                // Cargar arrays de multi-selección
                if (promo.filtro) {
                    this.selectedCategories = promo.filtro.categorias || [];
                    this.selectedBrands = promo.filtro.marcas || [];

                    // Mapear códigos a objetos de producto si existen
                    if (promo.filtro.codigos_productos?.length > 0) {
                        this.selectedProducts = promo.filtro.codigos_productos.map((codigo: string) => ({
                            codigo_interno: codigo,
                            nombre: 'Cargando...' // Temporal hasta que busquemos nombres si es necesario
                        }));

                        // Opcional: Cargar detalles reales de productos seleccionados
                        this.loadSelectedProductsDetails(promo.filtro.codigos_productos);
                    }
                }

                this.syncFiltro();
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    loadSelectedProductsDetails(codigos: string[]) {
        // Implementación mínima para mostrar nombres reales en los chips al editar
        // This approach might be inefficient for many products. Consider a single API call if available.
        codigos.forEach(codigo => {
            this.productService.searchAdminProducts(codigo).subscribe(res => {
                const found = res.data.find((p: any) => p.codigo_interno === codigo);
                if (found) {
                    const idx = this.selectedProducts.findIndex(p => p.codigo_interno === codigo);
                    if (idx !== -1) {
                        this.selectedProducts[idx] = found;
                        this.cdr.detectChanges();
                    }
                }
            });
        });
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        const formValue = this.form.value;

        // Ensure filtro arrays are current
        const promoData = {
            ...formValue,
            filtro: {
                categorias: this.selectedCategories,
                marcas: this.selectedBrands,
                codigos_productos: this.selectedProducts.map(p => p.codigo_interno)
            }
        };

        if (this.isEdit && this.promotionId) {
            this.promocionesService.update(this.promotionId, promoData).subscribe({
                next: () => this.router.navigate(['/admin/promociones']),
                error: (err: any) => { console.error(err); this.loading = false; }
            });
        } else {
            this.promocionesService.create(promoData).subscribe({
                next: () => this.router.navigate(['/admin/promociones']),
                error: (err: any) => { console.error(err); this.loading = false; }
            });
        }
    }
}
