
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShippingConfig, ShippingConfigDocument } from './schemas/shipping-config.schema';
import { ShippingZone, ShippingZoneDocument } from './schemas/shipping-zone.schema';
import { ShippingRate, ShippingRateDocument } from './schemas/shipping-rate.schema';
import { ShippingCity, ShippingCityDocument } from './schemas/shipping-city.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { UsuariosService } from '../users/usuarios.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ShippingService {
    constructor(
        @InjectModel(ShippingConfig.name) private shippingModel: Model<ShippingConfigDocument>,
        @InjectModel(ShippingZone.name) private zoneModel: Model<ShippingZoneDocument>,
        @InjectModel(ShippingRate.name) private rateModel: Model<ShippingRateDocument>,
        @InjectModel(ShippingCity.name) private cityModel: Model<ShippingCityDocument>,
        private readonly notificationsService: NotificationsService,
        private readonly usuariosService: UsuariosService,
    ) { }

    // --- Config Global ---
    async getConfig(): Promise<ShippingConfig> {
        let config = await this.shippingModel.findOne();
        if (!config) {
            config = await this.shippingModel.create({});
        }
        return config;
    }

    async updateConfig(data: Partial<ShippingConfig>): Promise<ShippingConfig> {
        const config = await this.shippingModel.findOneAndUpdate({}, data, { new: true, upsert: true });

        // Notify Admins
        this.notifyAdmins().catch(err => console.error('Error notifying admins', err));

        return config;
    }

    // --- ZONES ---
    async getZones(): Promise<ShippingZone[]> {
        return this.zoneModel.find({ active: true }).exec();
    }

    async createZone(data: Partial<ShippingZone>): Promise<ShippingZone> {
        return this.zoneModel.create(data);
    }

    async updateZone(id: string, data: Partial<ShippingZone>): Promise<any> {
        return this.zoneModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async deleteZone(id: string): Promise<any> {
        // Soft delete or hard? Hard for now.
        // Also delete rates?
        await this.rateModel.deleteMany({ zone_id: id });
        return this.zoneModel.findByIdAndDelete(id);
    }

    // --- RATES ---
    async getRates(zoneId: string): Promise<ShippingRate[]> {
        return this.rateModel.find({ zone_id: zoneId, active: true }).sort({ min_weight: 1 }).exec();
    }

    async getAllRates(): Promise<ShippingRate[]> {
        return this.rateModel.find({ active: true }).exec();
    }

    async createRate(zoneId: string, data: Partial<ShippingRate>): Promise<ShippingRate> {
        return this.rateModel.create({ ...data, zone_id: zoneId });
    }

    async updateRate(id: string, data: Partial<ShippingRate>): Promise<any> {
        return this.rateModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async deleteRate(id: string): Promise<any> {
        return this.rateModel.findByIdAndDelete(id);
    }

    // --- IMPORT FROM EXCEL ---
    async importRatesFromExcel(buffer: Buffer): Promise<any> {
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        let importedZones = 0;
        let importedRates = 0;

        // Expected Columns: Zone, MinWeight, MaxWeight, Price, Provinces (comma separated)
        for (const row of data as any[]) {
            const zoneName = row['Zone'] || row['Zona'];
            const minWeight = Number(row['MinWeight'] || row['PesoMin'] || 0);
            const maxWeight = Number(row['MaxWeight'] || row['PesoMax'] || 9999);
            const price = Number(row['Price'] || row['Precio'] || 0);
            const provincesRaw = row['Provinces'] || row['Provincias'] || '';

            if (!zoneName) continue;

            // Find or Create Zone
            let zone = await this.zoneModel.findOne({ name: zoneName });
            if (!zone) {
                const provinces = provincesRaw.split(',').map(p => p.trim()).filter(p => p);
                zone = await this.zoneModel.create({ name: zoneName, provinces, active: true });
                importedZones++;
            } else if (provincesRaw) {
                // Update provinces if provided
                const provinces = provincesRaw.split(',').map(p => p.trim()).filter(p => p);
                if (provinces.length > 0) {
                    zone.provinces = provinces;
                    await zone.save();
                }
            }

            // Create Rate
            await this.rateModel.create({
                zone_id: zone._id,
                min_weight: minWeight,
                max_weight: maxWeight,
                price: price
            });
            importedRates++;
        }

        this.notifyAdmins().catch(console.error);
        return { importedZones, importedRates };
    }

    // --- CALCULATION LOGIC (New) ---
    // Helper: Normalize province name (remove accents, prefixes, case)
    private normalizeProvince(name: string): string {
        if (!name) return '';
        return name
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents (á->a)
            .replace(/provincia\s+(de\s+|del\s+)?/g, "")      // Remove "Provincia de/del"
            .replace(/\s+(province|state|region)$/g, "")      // Remove English suffixes
            .trim();
    }

    async calculateShippingCost(province: string, weightKg: number): Promise<number> {
        const normalizedInput = this.normalizeProvince(province);

        console.log(`[Shipping] Calc for: '${province}' (Norm: '${normalizedInput}'), Weight: ${weightKg}`);

        // 1. Check if we have a specific City configuration
        let city = await this.cityModel.findOne({
            $or: [
                { name: { $regex: new RegExp(`^${normalizedInput}$`, 'i') } },
                { province: { $regex: new RegExp(`^${normalizedInput}$`, 'i') } }
            ]
        });

        let distance = 0;

        if (city) {
            console.log(`[Shipping] Found City/Province config: ${city.name}, Distance: ${city.distance_km}km`);
            if (city.is_custom_rate) {
                console.log(`[Shipping] City has CUSTOM RATE: $${city.custom_price}`);
                return city.custom_price || 0;
            }
            distance = city.distance_km;
        } else {
            console.log(`[Shipping] No specific City/Province config found for '${normalizedInput}'. Assuming distance 0 (or fallback).`);
        }

        // 2. Find matching Zone
        const allZones = await this.zoneModel.find({ active: true }).exec();
        // Match zone by stored province list OR by the found city's province
        const zone = allZones.find(z =>
            z.provinces?.some(p => this.normalizeProvince(p) === normalizedInput) ||
            (city && z.provinces?.some(p => this.normalizeProvince(p) === this.normalizeProvince(city.province)))
        );

        if (!zone) {
            console.log(`[Shipping] No Zone matched for '${normalizedInput}'`);
            // 3. Fallback (Global)
            const globalConfig = await this.getConfig();
            if (!globalConfig.isActive) return 0;
            return globalConfig.baseRate + (weightKg * globalConfig.ratePerKg);
        }

        console.log(`[Shipping] Matched Zone: ${zone.name}, Multiplier: $${zone.multiplier}/km`);

        // 3. Find Base Rate for Weight
        let basePrice = 0;
        try {
            const rate = await this.rateModel.findOne({
                zone_id: zone._id,
                active: true,
                min_weight: { $lte: weightKg },
                max_weight: { $gte: weightKg }
            });

            if (rate) {
                basePrice = rate.price;
                console.log(`[Shipping] Base Rate for ${weightKg}kg: $${basePrice}`);
            } else {
                console.log(`[Shipping] No specific rate for ${weightKg}kg in zone. Using 0 base.`);
            }
        } catch (e) {
            console.error("Error finding rate", e);
        }

        // 4. Calculate Final Cost
        // Cost = (Distance * ZoneMultiplier) + BaseWeightPrice
        const mileageCost = distance * (zone.multiplier || 0);
        const totalCost = mileageCost + basePrice;

        console.log(`[Shipping] Calculation: (${distance}km * $${zone.multiplier}) + $${basePrice} = $${totalCost}`);

        return Number(totalCost.toFixed(2));
    }

    // --- CITIES ---
    async getCities(): Promise<ShippingCityDocument[]> {
        return this.cityModel.find().sort({ name: 1 }).exec();
    }

    async createCity(data: Partial<ShippingCityDocument>): Promise<ShippingCityDocument> {
        return this.cityModel.create(data);
    }

    async updateCity(id: string, data: Partial<ShippingCityDocument>): Promise<ShippingCityDocument> {
        return this.cityModel.findByIdAndUpdate(id, data, { new: true }).exec() as Promise<ShippingCityDocument>;
    }

    async deleteCity(id: string): Promise<any> {
        return this.cityModel.findByIdAndDelete(id);
    }

    private async notifyAdmins() {
        // Use UsuariosService to find all users (since findAll does not support filter yet)
        const allUsers = await this.usuariosService.findAll();
        // Filter for admins - assuming 'rol' field based on standard, or check schema
        const admins = allUsers.filter(u => u.role === 'admin' || (u as any)['rol'] === 'admin'); // Safe check

        for (const admin of admins) {
            await this.notificationsService.create({
                usuario_id: admin._id.toString(),
                titulo: 'Configuración Envíos Actualizada',
                mensaje: 'Se han actualizado las tarifas de envío.',
                tipo: 'info'
            });
        }
    }
}

