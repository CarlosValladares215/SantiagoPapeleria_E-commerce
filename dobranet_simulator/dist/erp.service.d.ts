import { OnModuleInit } from '@nestjs/common';
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
export declare class ErpService implements OnModuleInit {
    private products;
    onModuleInit(): void;
    private loadExcel;
    private parseMoney;
    private parseInteger;
    getCatalogo(params: any): Product[];
    getProducto(cod: string): Product | {
        error: string;
    };
    createOrder(data: any): {
        STA: string;
        MSG: string;
        'ORDVEN-ID'?: undefined;
        'ORDVEN-NUM'?: undefined;
        TOTAL?: undefined;
    } | {
        STA: string;
        'ORDVEN-ID': number;
        'ORDVEN-NUM': string;
        TOTAL: number;
        MSG?: undefined;
    };
}
