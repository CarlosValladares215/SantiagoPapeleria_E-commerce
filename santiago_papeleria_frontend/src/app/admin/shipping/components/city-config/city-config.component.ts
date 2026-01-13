import { Component, inject, signal, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ShippingStateService } from '../../services/shipping-state.service';
import { ShippingCity } from '../../../../services/shipping.service';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-city-config',
    standalone: true,
    imports: [CommonModule, FormsModule, LucideAngularModule],
    template: `
    <div class="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
                <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <lucide-icon name="map-pin" class="w-6 h-6 text-blue-600"></lucide-icon>
                    Configuración de Ciudades y Distancias
                </h2>
                <p class="text-slate-500 text-sm mt-1">Define las distancias desde Loja para el cálculo de envío</p>
            </div>
            <button (click)="openModal()" class="btn btn-primary flex items-center gap-2">
                <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
                Nueva Ciudad
            </button>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-slate-50/80 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                        <th class="px-6 py-4">Ciudad</th>
                        <th class="px-6 py-4">Provincia</th>
                        <th class="px-6 py-4 text-center">Distancia (km)</th>
                        <th class="px-6 py-4 text-center">Tipo Tarifa</th>
                        <th class="px-6 py-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <tr *ngFor="let city of state.cities()" class="hover:bg-slate-50 transition-colors">
                        <td class="px-6 py-4 font-medium text-slate-800">{{ city.name }}</td>
                        <td class="px-6 py-4 text-slate-600">{{ city.province }}</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {{ city.distance_km }} km
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div *ngIf="city.is_custom_rate" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Fija: $ {{ city.custom_price }}
                            </div>
                            <div *ngIf="!city.is_custom_rate" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Calculada
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex justify-end gap-2">
                                <button (click)="openModal(city)" class="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                                    <lucide-icon name="edit-2" class="w-4 h-4"></lucide-icon>
                                </button>
                                <button (click)="deleteCity(city._id!)" class="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors">
                                    <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr *ngIf="state.cities().length === 0">
                        <td colspan="5" class="px-6 py-12 text-center text-slate-400">
                            No hay ciudades configuradas.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modal -->
    <div *ngIf="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-fade-in-up flex flex-col md:flex-row h-[90vh] md:h-auto">
            
            <!-- Map Section -->
            <div class="w-full md:w-1/2 bg-slate-100 relative min-h-[300px]">
                <div id="map" class="absolute inset-0 z-0"></div>
                <div class="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm text-xs font-medium text-slate-600 max-w-[200px]">
                   📍 Haz clic en el mapa para ubicar la ciudad y calcular la distancia.
                </div>
            </div>

            <!-- Form Section -->
            <div class="w-full md:w-1/2 flex flex-col">
                <div class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 class="font-bold text-slate-800">{{ isEditing ? 'Editar Ciudad' : 'Nueva Ciudad' }}</h3>
                    <button (click)="closeModal()" class="text-slate-400 hover:text-slate-600">
                        <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
                    </button>
                </div>
                
                <div class="p-6 space-y-4 overflow-y-auto flex-1">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ciudad</label>
                            <input [(ngModel)]="currentCity.name" type="text" placeholder="Ej. Quito" 
                                   class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Provincia</label>
                            <input [(ngModel)]="currentCity.province" type="text" placeholder="Ej. Pichincha" 
                                   class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Distancia desde Loja (km)</label>
                        <div class="relative">
                            <input [(ngModel)]="currentCity.distance_km" type="number" min="0" step="0.1"
                                   class="w-full pl-3 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-mono">
                            <span class="absolute right-3 top-2 text-slate-400 text-xs">km</span>
                        </div>
                        <p class="text-[10px] text-slate-400 mt-1">Calculada automáticamente o ingrésala manualmente.</p>
                    </div>

                    <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <label class="flex items-center gap-3 cursor-pointer">
                            <div class="relative inline-flex items-center">
                                <input type="checkbox" [(ngModel)]="currentCity.is_custom_rate" class="sr-only peer">
                                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </div>
                            <span class="text-sm font-medium text-slate-700">Usar Tarifa Fija (Ignora distancia)</span>
                        </label>

                        <div *ngIf="currentCity.is_custom_rate" class="mt-4 animate-fade-in">
                            <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Precio Fijo</label>
                            <div class="relative">
                                <span class="absolute left-3 top-2 text-slate-400">$</span>
                                <input [(ngModel)]="currentCity.custom_price" type="number" min="0" step="0.01"
                                       class="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 font-mono">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button (click)="closeModal()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
                        Cancelar
                    </button>
                    <button (click)="saveCity()" class="btn btn-primary px-6 py-2 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20">
                        {{ isEditing ? 'Actualizar' : 'Guardar' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
    `,
    styles: [`
        #map { height: 100%; min-height: 300px; width: 100%; z-index: 10; }
    `]
})
export class CityConfigComponent implements OnDestroy {

    state = inject(ShippingStateService);
    http = inject(HttpClient);
    zone = inject(NgZone);
    cdr = inject(ChangeDetectorRef);

    isModalOpen = false;
    isEditing = false;

    // Loja Coordinates (Approximate Center)
    private readonly ORIGIN_COORDS = { lat: -3.99313, lng: -79.20422 };
    private map: L.Map | undefined;
    private markers: L.LayerGroup | undefined;

    // Use a fresh object reference for every update to ensure Change Detection picks it up
    currentCity: Partial<ShippingCity> = {
        name: '',
        province: '',
        distance_km: 0,
        is_custom_rate: false,
        custom_price: 0,
        coordinates: undefined
    };

    openModal(city?: ShippingCity) {
        if (city) {
            this.isEditing = true;
            this.currentCity = { ...city };
        } else {
            this.isEditing = false;
            this.currentCity = {
                name: '',
                province: '',
                distance_km: 0,
                is_custom_rate: false,
                custom_price: 0,
                coordinates: undefined
            };
        }
        this.isModalOpen = true;

        // Wait for modal transition then init map
        setTimeout(() => {
            this.initMap();
        }, 300);
    }

    closeModal() {
        this.isModalOpen = false;
        if (this.map) {
            this.map.remove();
            this.map = undefined;
        }
    }

    private initMap() {
        if (this.map) return;

        // --- Fix Leaflet Default Icon ---
        const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
        const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
        const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

        const DefaultIcon = L.icon({
            iconUrl: iconUrl,
            iconRetinaUrl: iconRetinaUrl,
            shadowUrl: shadowUrl,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41]
        });

        L.Marker.prototype.options.icon = DefaultIcon;
        // --------------------------------

        // Default to Ecuador view
        this.map = L.map('map').setView([-1.8312, -78.1834], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        this.markers = L.layerGroup().addTo(this.map);

        // Add Origin Marker (Loja)
        const originIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: #2563eb; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        L.marker([this.ORIGIN_COORDS.lat, this.ORIGIN_COORDS.lng], { icon: originIcon })
            .bindPopup('Origen: Loja')
            .addTo(this.map);

        // Add Destination Marker if editing
        if (this.currentCity.coordinates) {
            this.addDestinationMarker(this.currentCity.coordinates.lat, this.currentCity.coordinates.lng);
        }

        // Map Click Event
        this.map.on('click', (e: L.LeafletMouseEvent) => {
            this.zone.run(() => {
                this.handleMapClick(e.latlng.lat, e.latlng.lng);
            });
        });
    }

    private handleMapClick(lat: number, lng: number) {
        this.addDestinationMarker(lat, lng);

        const dist = this.calculateDistance(lat, lng);

        // Reverse Geocoding with explicit Change Detection
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
        this.http.get<any>(url).subscribe({
            next: (data) => {
                let name = this.currentCity.name;
                let province = this.currentCity.province;

                if (data.address) {
                    // Try to find city or town name
                    const city = data.address.city || data.address.town || data.address.village || data.address.county;
                    const prov = data.address.state || data.address.region;

                    if (city) name = city;
                    if (prov) province = prov;
                }

                // Update state securely within Zone
                this.zone.run(() => {
                    this.currentCity = {
                        ...this.currentCity,
                        name: name,
                        province: province,
                        distance_km: dist,
                        coordinates: { lat, lng }
                    };
                    this.cdr.detectChanges(); // Force update
                });
            },
            error: (err) => console.error('Reverse geocoding error:', err)
        });
    }

    private addDestinationMarker(lat: number, lng: number) {
        if (!this.markers) return;
        this.markers.clearLayers();

        L.marker([lat, lng])
            .bindPopup('Destino')
            .addTo(this.markers)
            .openPopup();
    }

    private calculateDistance(lat: number, lng: number): number {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat - this.ORIGIN_COORDS.lat);
        const dLon = this.deg2rad(lng - this.ORIGIN_COORDS.lng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(this.ORIGIN_COORDS.lat)) * Math.cos(this.deg2rad(lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km

        // Add 20% buffer for road distance approximation vs straight line
        const approxRoadDistance = d * 1.2;

        return Number(approxRoadDistance.toFixed(2));
    }

    private deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }

    // Removed separate reverseGeocode method to integrate it into handleMapClick for better control flow

    saveCity() {
        if (!this.currentCity.name || !this.currentCity.province) return;

        if (this.isEditing && this.currentCity._id) {
            this.state.updateCity(this.currentCity._id, this.currentCity);
        } else {
            this.state.createCity(this.currentCity);
        }
        this.closeModal();
    }

    deleteCity(id: string) {
        this.state.deleteCity(id);
    }

    ngOnDestroy() {
        if (this.map) {
            this.map.remove();
        }
    }
}
