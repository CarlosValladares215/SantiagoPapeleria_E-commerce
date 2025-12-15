import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ErpService } from './erp.service';

@Controller('matrix/ports/acme/af58yz')
export class ErpController {
    constructor(private readonly erpService: ErpService) { }

    @Get()
    handleGet(@Query('CMD') cmd: string, @Query() params: any) {
        switch (cmd) {
            case 'STO_MTX_CAT_PRO':
                return this.erpService.getCatalogo(params);
            case 'STO_MTX_FIC_PRO':
                return this.erpService.getProducto(params.COD);
            default:
                return { error: 'Comando no reconocido' };
        }
    }

    @Post()
    handlePost(@Query('CMD') cmd: string, @Body() data: any) {
        if (cmd === 'STO_MTX_ORD_VEN') {
            return this.erpService.createOrder(data);
        }
        return { STA: 'ERROR', MSG: 'Comando no válido' };
    }
}
