"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpService = void 0;
const common_1 = require("@nestjs/common");
const XLSX = __importStar(require("xlsx"));
const path = __importStar(require("path"));
let ErpService = class ErpService {
    products = [];
    onModuleInit() {
        this.loadExcel();
    }
    loadExcel() {
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
            const salesMap = new Map();
            sheet2.forEach((row) => {
                if (row.COD) {
                    const cod = String(row.COD).trim();
                    salesMap.set(cod, row);
                }
            });
            this.products = sheet1.map((row) => {
                const cod = String(row.COD || '').trim();
                if (!cod)
                    return null;
                const salesData = salesMap.get(cod) || {};
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
            }).filter(p => p !== null);
            console.log(`✅ ${this.products.length} productos cargados desde Excel`);
        }
        catch (error) {
            console.error('Error loading Excel file:', error);
            this.products = [];
        }
    }
    parseMoney(val) {
        if (val === undefined || val === null || val === '')
            return 0;
        if (typeof val === 'number')
            return val;
        const strVal = String(val).replace(',', '.');
        const parsed = parseFloat(strVal);
        return isNaN(parsed) ? 0 : parsed;
    }
    parseInteger(val) {
        if (val === undefined || val === null || val === '')
            return 0;
        if (typeof val === 'number')
            return Math.floor(val);
        const strVal = String(val).replace(',', '.');
        const parsed = parseInt(strVal, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    getCatalogo(params) {
        let result = [...this.products];
        if (params.LIN) {
            result = result.filter(p => p.G2 && p.G2.toUpperCase().includes(params.LIN.toUpperCase()));
        }
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
    getProducto(cod) {
        const product = this.products.find(p => p.COD === cod);
        if (!product) {
            return { error: 'Producto no encontrado' };
        }
        return product;
    }
    createOrder(data) {
        if (!data || !data.ITEMS || data.ITEMS.length === 0) {
            return { STA: 'ERROR', MSG: 'PAQUETE JSON VACIO' };
        }
        const total = data.ITEMS.reduce((sum, item) => sum + (item.UND * item.PRE), 0);
        const randomId = Math.floor(Math.random() * 900000) + 100000;
        return {
            STA: 'OK',
            'ORDVEN-ID': Math.floor(Math.random() * 1000000),
            'ORDVEN-NUM': `001-2025-11-${randomId}`,
            TOTAL: parseFloat(total.toFixed(2))
        };
    }
};
exports.ErpService = ErpService;
exports.ErpService = ErpService = __decorate([
    (0, common_1.Injectable)()
], ErpService);
//# sourceMappingURL=erp.service.js.map