import { Injectable, OnModuleInit } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as path from 'path';

export interface Product {
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
}

@Injectable()
export class ErpService implements OnModuleInit {
    private products: Product[] = [];

    onModuleInit() {
        this.loadExcel();
    }

    private loadExcel() {
        try {
            const filePath = path.join(process.cwd(), 'data', 'PRODUCTOS Y PRECIOS.xlsx');
            console.log(`Reading Excel file from: ${filePath}`);
            const workbook = XLSX.readFile(filePath);

            const sheet1Name = 'REPORTE DE PRODUCTOS';
            const sheet2Name = 'VENTANA CON PRECIOS';

            if (!workbook.Sheets[sheet1Name] || !workbook.Sheets[sheet2Name]) {
                console.error(`Missing sheets. Expected "${sheet1Name}" and "${sheet2Name}".`);
                this.products = [];
                return;
            }

            const sheet1 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet1Name]);
            const sheet2 = XLSX.utils.sheet_to_json(workbook.Sheets[sheet2Name]);

            const salesMap = new Map<string, any>();

            // Index Sheet 2 (Sales) by COD
            sheet2.forEach((row: any) => {
                if (row.COD) {
                    const cod = String(row.COD).trim();
                    salesMap.set(cod, row);
                }
            });

            // Merge Logic matches COD
            this.products = sheet1.map((row: any) => {
                const cod = String(row.COD || '').trim();
                if (!cod) return null;

                const salesData = salesMap.get(cod) || {};

                // Extract "PRECIO POR M" or "PRECIO POR MAYOR"
                const pvmRaw = salesData['PRECIO POR M'] !== undefined
                    ? salesData['PRECIO POR M']
                    : salesData['PRECIO POR MAYOR'];

                return {
                    COD: cod,
                    NOM: String(row.NOM || '').trim(),
                    G1: String(row.G1 || '').trim(),
                    G2: String(row.G2 || '').trim(),
                    G3: String(row.G3 || '').trim(),
                    BAR: String(row.BAR || '').trim(),

                    STK: this.parseInteger(salesData.STK),
                    IVA: this.parseInteger(salesData.IVA),
                    PVP: this.parseMoney(salesData.PVP),
                    PVM: this.parseMoney(pvmRaw)
                };
            }).filter(p => p !== null) as Product[];

            console.log(`✅ ${this.products.length} productos cargados desde Excel`);

        } catch (error) {
            console.error('Error loading Excel file:', error);
            this.products = [];
        }
    }

    private parseMoney(val: any): number {
        if (val === undefined || val === null || val === '') return 0;
        // Handle if it's already a number
        if (typeof val === 'number') return val;
        // Handle "9,0625" -> replace comma with dot
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

    getCatalogo(params: any): Product[] {
        let result = [...this.products];

        // Filter by LIN (Category) - Mapped to G2? 
        // User didn't specify filter logic in final instructions, but existing logic used LIN->G2.
        if (params.LIN) {
            result = result.filter(p => p.G2 && p.G2.toUpperCase().includes(params.LIN.toUpperCase()));
        }

        // Filter by TAG (Search)
        if (params.TAG) {
            const tag = params.TAG.toUpperCase();
            result = result.filter(p => p.NOM.toUpperCase().includes(tag) || p.COD.toUpperCase().includes(tag));
        }

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

    createOrder(data: any) {
        if (!data || !data.ITEMS || data.ITEMS.length === 0) {
            return { STA: 'ERROR', MSG: 'PAQUETE JSON VACIO' };
        }
        const total = data.ITEMS.reduce((sum: number, item: any) => sum + (item.UND * item.PRE), 0);
        const randomId = Math.floor(Math.random() * 900000) + 100000;
        return {
            STA: 'OK',
            'ORDVEN-ID': Math.floor(Math.random() * 1000000),
            'ORDVEN-NUM': `001-2025-11-${randomId}`,
            TOTAL: parseFloat(total.toFixed(2))
        };
    }
}
