import { Injectable, inject } from '@angular/core';
import { ShippingStateService } from './shipping-state.service';
import { ShippingRate } from '../../../services/shipping.service';

export interface CalculatedShipping {
    baseCost: number;     // e.g. Zone base price for weight
    distancePart: number; // e.g. Distance * Multiplier
    weightPart: number;   // same as baseCost, but kept for clarity if needed separation
    subtotal: number;
    tax: number;
    total: number;
    isFreeShipping: boolean;
    appliedRule: 'CUSTOM_CITY' | 'DISTANCE' | 'ZONE_WEIGHT' | 'GLOBAL_FALLBACK';
}

@Injectable({
    providedIn: 'root'
})
export class ShippingCalculatorService {
    private state = inject(ShippingStateService);

    calculateEstimatedShipping(cityId: string, weight: number, cartValue: number = 0): CalculatedShipping {
        const config = this.state.config();
        const cities = this.state.cities();
        const zones = this.state.zones();
        const allRates = this.state.allRates();

        const city = cities.find(c => c._id === cityId);

        let baseCost = 0;
        let distancePart = 0;
        let weightPart = 0;
        let rule: CalculatedShipping['appliedRule'] = 'GLOBAL_FALLBACK';

        if (city) {
            // 1. Custom City Rate
            if (city.is_custom_rate && city.custom_price !== undefined) {
                baseCost = city.custom_price;
                rule = 'CUSTOM_CITY';
            } else {
                // 2. Distance + Zone Logic
                // Find Zone
                const zone = zones.find(z =>
                    z.active && z.provinces.some(p => this.normalize(p) === this.normalize(city.province))
                );

                if (zone) {
                    // 2a. Distance Cost
                    if (city.distance_km && zone.multiplier) {
                        distancePart = city.distance_km * zone.multiplier;
                        rule = 'DISTANCE';
                    }

                    // 2b. Weight Cost (Zone Rates)
                    // We search in the global rates list
                    const rate = allRates.find(r =>
                        r.zone_id === zone._id &&
                        r.active &&
                        weight >= r.min_weight &&
                        weight < r.max_weight
                    );

                    if (rate) {
                        weightPart = rate.price;
                        if (rule !== 'DISTANCE') rule = 'ZONE_WEIGHT'; // If no distance, it's just zone weight
                    }
                }
            }
        } else {
            console.warn(`[Calculator] City not found for ID: ${cityId}`);
        }

        // If no specific rule applied (or only partial), add global fallback?
        // The prompt says: "Sumar (Costo Distancia + Costo Peso + baseRate global)".
        // So baseRate global is ALWAYS added unless it's a Custom City Rate? 

        let subtotal = 0;

        if (rule === 'CUSTOM_CITY') {
            subtotal = baseCost;
        } else {
            subtotal = distancePart + weightPart + (config.baseRate || 0);
        }

        // Business Rules
        // Free Shipping - CHECK AGAINST CART VALUE (cartValue)
        const freeThreshold = config.freeShippingThreshold || 0;
        const isFreeShipping = freeThreshold > 0 && cartValue >= freeThreshold;

        let finalTotal = isFreeShipping ? 0 : subtotal;

        // Tax
        const tax = finalTotal * (config.ivaRate || 0);
        finalTotal += tax;

        return {
            baseCost: (rule === 'CUSTOM_CITY') ? baseCost : (config.baseRate || 0),
            distancePart,
            weightPart,
            subtotal,
            tax,
            total: finalTotal,
            isFreeShipping,
            appliedRule: rule
        };
    }

    private normalize(str: string): string {
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    }
}
