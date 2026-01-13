import { Controller, Get, Put, Post, Delete, Body, Param, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { ShippingService } from './shipping.service';
import { ShippingConfig } from './schemas/shipping-config.schema';
import { ShippingZone } from './schemas/shipping-zone.schema';
import { ShippingRate } from './schemas/shipping-rate.schema';
import { ShippingCity } from './schemas/shipping-city.schema';

@Controller('shipping')
export class ShippingController {
    constructor(private readonly shippingService: ShippingService) { }

    @Get('config')
    async getConfig(): Promise<ShippingConfig> {
        return this.shippingService.getConfig();
    }

    @Put('config')
    async updateConfig(@Body() data: Partial<ShippingConfig>): Promise<ShippingConfig> {
        try {
            return await this.shippingService.updateConfig(data);
        } catch (error) {
            const logPath = path.join(process.cwd(), 'shipping-error.log');
            const logMsg = `${new Date().toISOString()} - Error updating config: ${error.message}\nStack: ${error.stack}\nData: ${JSON.stringify(data)}\n\n`;
            fs.appendFileSync(logPath, logMsg);
            throw new HttpException('Error updating shipping config', HttpStatus.BAD_REQUEST);
        }
    }

    @Get('zones')
    async getZones(): Promise<ShippingZone[]> {
        return this.shippingService.getZones();
    }

    @Post('zones')
    async createZone(@Body() data: Partial<ShippingZone>): Promise<ShippingZone> {
        return this.shippingService.createZone(data);
    }

    @Put('zones/:id')
    async updateZone(@Param('id') id: string, @Body() data: Partial<ShippingZone>): Promise<ShippingZone> {
        return this.shippingService.updateZone(id, data);
    }

    @Delete('zones/:id')
    async deleteZone(@Param('id') id: string): Promise<any> {
        return this.shippingService.deleteZone(id);
    }

    @Get('zones/:id/rates')
    async getRates(@Param('id') zoneId: string): Promise<ShippingRate[]> {
        return this.shippingService.getRates(zoneId);
    }

    @Get('rates')
    async getAllRates(): Promise<ShippingRate[]> {
        return (this.shippingService as any).getAllRates();
    }

    @Post('zones/:id/rates')
    async createRate(@Param('id') zoneId: string, @Body() data: Partial<ShippingRate>): Promise<ShippingRate> {
        return this.shippingService.createRate(zoneId, data);
    }

    @Put('rates/:id')
    async updateRate(@Param('id') id: string, @Body() data: Partial<ShippingRate>): Promise<ShippingRate> {
        return this.shippingService.updateRate(id, data);
    }

    @Delete('rates/:id')
    async deleteRate(@Param('id') id: string): Promise<any> {
        return this.shippingService.deleteRate(id);
    }

    // --- CITIES ---
    @Get('cities')
    async getCities(): Promise<any[]> {
        return this.shippingService.getCities();
    }

    @Post('cities')
    async createCity(@Body() data: any): Promise<any> {
        return this.shippingService.createCity(data);
    }

    @Put('cities/:id')
    async updateCity(@Param('id') id: string, @Body() data: any): Promise<any> {
        return this.shippingService.updateCity(id, data);
    }

    @Delete('cities/:id')
    async deleteCity(@Param('id') id: string): Promise<any> {
        return this.shippingService.deleteCity(id);
    }

    @Post('calculate')
    async calculate(@Body() data: { province: string; weight: number }): Promise<{ cost: number }> {
        const cost = await this.shippingService.calculateShippingCost(data.province, data.weight);
        return { cost };
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    async importExcel(@UploadedFile() file: any) {
        if (!file) throw new HttpException('File not found', HttpStatus.BAD_REQUEST);
        return this.shippingService.importRatesFromExcel(file.buffer);
    }
}
