import { ErpService } from './erp.service';
export declare class ErpController {
    private readonly erpService;
    constructor(erpService: ErpService);
    handleGet(cmd: string, params: any): import("./erp.service").Product | import("./erp.service").Product[] | {
        error: string;
    };
    handlePost(cmd: string, data: any): {
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
