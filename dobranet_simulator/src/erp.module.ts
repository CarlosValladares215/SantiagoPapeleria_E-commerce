import { Module } from '@nestjs/common';
import { ErpController } from './erp.controller';
import { ErpService } from './erp.service';

@Module({
    controllers: [ErpController],
    providers: [ErpService],
    exports: [ErpService] // Export if needed elsewhere, though here it's main module
})
export class ErpModule { }
