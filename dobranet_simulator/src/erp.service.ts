import { Injectable, OnModuleInit } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

export interface Product {
    ID: number;
    COD: string;
    NOM: string;
    BAR: string;
    G1: string;
    G2: string;
    G3: string;
    PVP: number;
    PVM: number;
    STK: number;
    IVA: number;

    // Enriched fields
    NOT?: string;
    FOT?: string;
    MRK?: string;
    LIN?: string; // Mapped line code
    ROW?: number;

    // Extra internal fields
    GAL?: string[];
    PES?: number;
    DIM?: { L: number; A: number; H: number };
    SPC?: Array<{ label: string; value: string }>;
}

@Injectable()
export class ErpService implements OnModuleInit {
    private products: Product[] = [];
    private enrichmentData: any = {};
    private categoriesData: any = {};
    private brandsData: any = {};
    private photoBaseUrl = 'http://localhost:3000/assets/img/products/'; // Placeholder, not used directly by legacy DobraNet protocol but useful logically

    onModuleInit() {
        this.loadData();
    }

    private loadData() {
        try {
            console.log('🔄 Loading DobraNet Simulator Data...');
            const dataDir = path.join(process.cwd(), 'data');

            // 1. Load JSON Support Files
            this.enrichmentData = JSON.parse(fs.readFileSync(path.join(dataDir, 'enrichment.json'), 'utf8'));
            this.categoriesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'categories.json'), 'utf8'));
            this.brandsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'brands.json'), 'utf8'));

            // 2. Load Excel
            const excelPath = path.join(dataDir, 'PRODUCTOS Y PRECIOS.xlsx');
            const workbook = XLSX.readFile(excelPath);
            const sheet1 = XLSX.utils.sheet_to_json(workbook.Sheets['REPORTE DE PRODUCTOS']);
            const sheet2 = XLSX.utils.sheet_to_json(workbook.Sheets['VENTANA CON PRECIOS']);

            // 3. Index Price Sheet
            const salesMap = new Map<string, any>();
            sheet2.forEach((row: any) => {
                if (row.COD) salesMap.set(String(row.COD).trim(), row);
            });

            // 4. Merge & Enrich
            let rowCounter = 1;
            const lineMapping = this.categoriesData.line_mapping || {};
            const defaults = this.enrichmentData.default_values || {};

            this.products = sheet1.map((row: any) => {
                const cod = String(row.COD || '').trim();
                if (!cod) return null;

                const salesData = salesMap.get(cod) || {};

                // Determine price M (Wholesale)
                const pvmRaw = salesData['PRECIO POR M'] !== undefined ? salesData['PRECIO POR M'] : salesData['PRECIO POR MAYOR'];

                // Basic ERP Data
                const baseProduct: any = {
                    ID: 10000 + rowCounter, // Generate synthetic ID
                    COD: cod,
                    NOM: String(row.NOM || '').trim(),
                    G1: String(row.G1 || '').trim(),
                    G2: String(row.G2 || '').trim(),
                    G3: String(row.G3 || '').trim(),
                    BAR: String(row.BAR || '').trim(),
                    STK: this.parseInteger(salesData.STK),
                    IVA: this.parseInteger(salesData.IVA),
                    PVP: this.parseMoney(salesData.PVP),
                    PVM: this.parseMoney(pvmRaw),
                    ROW: rowCounter++
                };

                // Match Categories if missing or not in set
                const validG3 = this.isValidCategory(baseProduct.G3);
                if (!baseProduct.G2 || !baseProduct.G3 || !validG3) {
                    const match = this.autoCategorize(baseProduct.NOM);
                    if (match) {
                        baseProduct.G2 = match.G2;
                        baseProduct.G3 = match.G3;
                        if (!baseProduct.LIN || baseProduct.LIN === '000') {
                            if (lineMapping[baseProduct.G2]) {
                                baseProduct.LIN = lineMapping[baseProduct.G2];
                            }
                        }
                    }
                }

                // Apply LIN Mapping (G2 -> Category Code)
                if (baseProduct.G2 && lineMapping[baseProduct.G2]) {
                    baseProduct.LIN = lineMapping[baseProduct.G2];
                } else {
                    if (!baseProduct.LIN) baseProduct.LIN = '000'; // Uncategorized
                }

                // --- ENRICHMENT LOGIC ---
                const enriched = this.enrichmentData.products[cod];

                // Description (NOT)
                baseProduct.NOT = enriched?.NOT || defaults.NOT || '';

                // Photo (FOT)
                baseProduct.FOT = enriched?.FOT || defaults.FOT || 'placeholder.png';

                // Brand (MRK) - Try enrichment, then deduce from name, then default
                if (enriched?.MRK) {
                    baseProduct.MRK = enriched.MRK;
                } else {
                    // Simple heuristic: try to find known brands in NOM
                    const foundBrand = Object.keys(this.brandsData.brands).find(b => baseProduct.NOM.includes(b));
                    baseProduct.MRK = foundBrand || defaults.MRK || 'GENERICO';
                }

                // Extras (Internal use if needed)
                baseProduct.GAL = enriched?.GAL || defaults.GAL || [];
                baseProduct.PES = enriched?.PES || defaults.PES || 0;
                baseProduct.DIM = enriched?.DIM || defaults.DIM || {};
                baseProduct.SPC = enriched?.SPC || defaults.SPC || [];

                return baseProduct;

            }).filter(p => p !== null) as Product[];

            console.log(`✅ Loaded ${this.products.length} enriched products.`);

        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.products = [];
        }
    }

    // --- QUERY METHODS ---

    getCatalogo(params: any): Product[] {
        let result = [...this.products];

        // Filter by LIN (Category Code)
        if (params.LIN) {
            // If LIN is passed, we check if the product's assigned LIN starts with it (hierarchy)
            result = result.filter(p => p.LIN && p.LIN.startsWith(params.LIN));
        }

        // Filter by MRK (Brand)
        if (params.MRK) {
            result = result.filter(p => p.MRK === params.MRK);
        }

        // Filter by TAG (Search in NOM or NOT)
        if (params.TAG) {
            const tag = params.TAG.toUpperCase();
            result = result.filter(p =>
                p.NOM.toUpperCase().includes(tag) ||
                p.COD.toUpperCase().includes(tag) ||
                (p.NOT && p.NOT.toUpperCase().includes(tag))
            );
        }

        // Filter by ROW range (e.g., 1-20)
        if (params.ROW) {
            const [start, end] = params.ROW.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
                result = result.filter(p => (p.ROW || 0) >= start && (p.ROW || 0) <= end);
            }
        }

        // Limit (TOP)
        if (params.TOP) {
            const limit = parseInt(params.TOP, 10);
            result = result.slice(0, limit);
        }

        return result;
    }

    getProducto(cod: string): Product | { error: string } {
        const product = this.products.find(p => p.COD === cod);
        if (!product) {
            return { error: 'Producto no encontrado' };
        }
        return product;
    }

    getCategorias(params: any) {
        // Return the 'root' node of categories.json matching the DobraNet STO_MTX_CAT_LIN format
        // The structure in categories.json is { root: { ... }, ... }
        // We usually return the content of 'root' which is the main category node.
        if (this.categoriesData.root) {
            return this.categoriesData.root;
        }
        return { error: 'Estructura de categorías no definida' };
    }

    // --- TRANSACTION METHODS ---

    createOrder(data: any) {
        if (!data || !data.ITEMS || data.ITEMS.length === 0) {
            return { STA: 'ERROR', MSG: 'PAQUETE JSON VACIO' };
        }
        // Basic Total Validations
        const total = data.ITEMS.reduce((sum: number, item: any) => sum + (item.UND * item.PRE), 0);

        // --- STOCK REDUCTION LOGIC ---
        // Validate and reduce stock
        for (const item of data.ITEMS) {
            const product = this.products.find(p => p.COD === item.COD);
            if (!product) {
                return { STA: 'ERROR', MSG: `PRODUCTO NO ENCONTRADO: ${item.COD}` };
            }
            if (product.STK < item.UND) {
                return { STA: 'ERROR', MSG: `STOCK INSUFICIENTE PARA: ${item.COD}. STK ACTUAL: ${product.STK}` };
            }
        }

        // If all valid, commit reductions
        for (const item of data.ITEMS) {
            const product = this.products.find(p => p.COD === item.COD);
            if (product) {
                product.STK -= item.UND;
            }
        }

        // Mock Response
        const randomId = Math.floor(Math.random() * 900000) + 100000;
        return {
            STA: 'OK',
            'ORDVEN-ID': Math.floor(Math.random() * 1000000),
            'ORDVEN-NUM': `001-2026-01-${randomId}`,
            TOTAL: parseFloat(total.toFixed(2))
        };
    }

    updateProduct(data: any) {
        if (!data || !data.COD) {
            return { STA: 'ERROR', MSG: 'CODIGO REQUERIDO' };
        }

        // RESTRICTION: Only NOM and NOT can be updated
        // Check for forbidden keys
        const allowedKeys = ['COD', 'NOM', 'NOT'];
        const receivedKeys = Object.keys(data);
        const forbidden = receivedKeys.find(k => !allowedKeys.includes(k));

        if (forbidden) {
            return {
                STA: 'ERROR',
                MSG: `CAMPO NO PERMITIDO: ${forbidden}. SOLO SE PERMITE 'NOM' Y 'NOT'.`
            };
        }

        const product = this.products.find(p => p.COD === data.COD);
        if (!product) {
            return { STA: 'ERROR', MSG: 'PRODUCTO NO ENCONTRADO' };
        }

        // Update in memory
        if (data.NOM) product.NOM = data.NOM;
        if (data.NOT) product.NOT = data.NOT;

        // Note: In a real simulation, we might want to persist this back to a file, 
        // but for now in-memory updates serve the session purpose.

        return {
            STA: 'OK',
            MSG: 'PRODUCTO ACTUALIZADO CORRECTAMENTE',
            COD: product.COD
        };
    }

    // --- HELPERS ---

    private parseMoney(val: any): number {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        const strVal = String(val).replace(',', '.');
        const parsed = parseFloat(strVal);
        return isNaN(parsed) ? 0 : parsed;
    }

    private parseInteger(val: any): number {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return Math.floor(val);
        const strVal = String(val).replace(',', '.');
        const parsed = parseInt(strVal, 10);
        return isNaN(parsed) ? 0 : parsed;
    }

    private autoCategorize(name: string): { G2: string, G3: string } | null {
        if (!name) return null;
        const upperName = name.toUpperCase();

        const root = this.categoriesData.root;
        if (!root || !root.DAT) return null;

        for (const g2 of root.DAT) {
            // 0. Specific keywords for common misalignments
            if (upperName.includes(' COL ') || upperName.includes('LARG') || upperName.includes('X12COL') || upperName.includes('PINTURAS DE MADERA')) {
                // If it looks like colors, check if COLORES is in this G2
                if (g2.DAT) {
                    const colCat = g2.DAT.find(sub => sub.NOM.toUpperCase() === 'COLORES');
                    if (colCat) return { G2: g2.NOM, G3: colCat.NOM };
                }
            }

            // 1. Strict
            if (upperName.includes(g2.NOM.toUpperCase())) {
                return { G2: g2.NOM, G3: g2.NOM };
            }
            if (g2.DAT) {
                for (const g3 of g2.DAT) {
                    if (upperName.includes(g3.NOM.toUpperCase())) {
                        return { G2: g2.NOM, G3: g3.NOM };
                    }
                }
            }
        }

        // 2. Token Matching
        const tokens = upperName.split(' ').filter(t => t.length > 3);
        if (tokens.length > 0) {
            for (const g2 of root.DAT) {
                if (!g2.NOM) continue;
                const g2Tokens = g2.NOM.toUpperCase().split(' ');
                if (tokens.some(t => g2Tokens.some(gt => gt.includes(t)))) {
                    // Try G3
                    if (g2.DAT) {
                        for (const g3 of g2.DAT) {
                            const g3Tokens = g3.NOM.toUpperCase().split(' ');
                            if (tokens.some(t => g3Tokens.some(gt => gt.includes(t)))) {
                                return { G2: g2.NOM, G3: g3.NOM };
                            }
                        }
                    }
                    return { G2: g2.NOM, G3: g2.NOM };
                }
            }
        }

        // 3. Fallback (Force First valid category)
        if (root.DAT.length > 0) {
            const fallback = root.DAT[0]; // Usually ACCESORIOS DE CABELLO
            const fallbackG3 = (fallback.DAT && fallback.DAT.length > 0) ? fallback.DAT[0].NOM : fallback.NOM;
            return { G2: fallback.NOM, G3: fallbackG3 };
        }

        return null;
    }

    private isValidCategory(catName: string): boolean {
        if (!catName) return false;
        const root = this.categoriesData.root;
        if (!root || !root.DAT) return false;

        const upper = catName.toUpperCase();
        for (const g2 of root.DAT) {
            if (g2.NOM.toUpperCase() === upper) return true;
            if (g2.DAT) {
                for (const g3 of g2.DAT) {
                    if (g3.NOM.toUpperCase() === upper) return true;
                }
            }
        }
        return false;
    }
}
