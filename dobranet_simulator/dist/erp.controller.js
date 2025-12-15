"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpController = void 0;
const common_1 = require("@nestjs/common");
const erp_service_1 = require("./erp.service");
let ErpController = class ErpController {
    erpService;
    constructor(erpService) {
        this.erpService = erpService;
    }
    handleGet(cmd, params) {
        switch (cmd) {
            case 'STO_MTX_CAT_PRO':
                return this.erpService.getCatalogo(params);
            case 'STO_MTX_FIC_PRO':
                return this.erpService.getProducto(params.COD);
            default:
                return { error: 'Comando no reconocido' };
        }
    }
    handlePost(cmd, data) {
        if (cmd === 'STO_MTX_ORD_VEN') {
            return this.erpService.createOrder(data);
        }
        return { STA: 'ERROR', MSG: 'Comando no válido' };
    }
};
exports.ErpController = ErpController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('CMD')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ErpController.prototype, "handleGet", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Query)('CMD')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ErpController.prototype, "handlePost", null);
exports.ErpController = ErpController = __decorate([
    (0, common_1.Controller)('matrix/ports/acme/af58yz'),
    __metadata("design:paramtypes", [erp_service_1.ErpService])
], ErpController);
//# sourceMappingURL=erp.controller.js.map