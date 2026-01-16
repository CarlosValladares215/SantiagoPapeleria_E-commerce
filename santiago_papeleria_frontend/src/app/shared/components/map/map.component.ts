import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

// Leaflet types only for TypeScript - we'll import the actual module dynamically
type LeafletMap = any;
type LeafletMarker = any;

@Component({
    selector: 'app-map',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="map-wrapper">
      <div class="map-container" #mapContainer></div>
      
      <!-- Locate Me Button -->
      <button 
        type="button"
        class="locate-btn"
        (click)="getCurrentLocation()"
        [disabled]="isLocating"
        title="Usar mi ubicación actual">
        <span *ngIf="!isLocating" class="material-symbols-outlined">my_location</span>
        <span *ngIf="isLocating" class="spinner"></span>
      </button>
    </div>
  `,
    styles: [`
    .map-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 350px;
    }
    .map-container {
      width: 100%;
      height: 100%;
      min-height: 350px;
      border-radius: 8px;
      z-index: 1;
      display: block;
    }
    .locate-btn {
      position: absolute;
      bottom: 20px;
      right: 10px;
      z-index: 1000;
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: white;
      border: 2px solid rgba(0,0,0,0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    }
    .locate-btn:hover:not(:disabled) {
      background: #f0f0f0;
      transform: scale(1.05);
    }
    .locate-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .locate-btn .material-symbols-outlined {
      font-size: 24px;
      color: #012e40;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #012e40;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() initialLocation: { lat: number, lng: number } | null = null;
    @Output() locationChange = new EventEmitter<{ lat: number, lng: number }>();

    @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

    private map: LeafletMap | undefined;
    private marker: LeafletMarker | undefined;
    private L: any; // Leaflet module reference

    // Santiago Papelería Default Coords (Loja, Ecuador)
    private readonly DEFAULT_COORDS = { lat: -3.99313, lng: -79.20422 };
    private isBrowser: boolean;

    isLocating = false;

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        this.isBrowser = isPlatformBrowser(this.platformId);
    }

    ngOnInit() {
        // Leaflet requires window, so we wait for browser
    }

    ngAfterViewInit() {
        if (this.isBrowser) {
            // Dynamically import Leaflet only in browser
            this.loadLeaflet();
        }
    }

    private async loadLeaflet() {
        try {
            // Dynamic import to avoid SSR issues
            this.L = await import('leaflet');

            // Slight delay to ensure container is rendered
            setTimeout(() => {
                this.initMap();
            }, 100);
        } catch (err) {
            console.error('Failed to load Leaflet:', err);
        }
    }

    private initMap() {
        if (!this.mapContainer || !this.L) return;

        const startCoords = this.initialLocation || this.DEFAULT_COORDS;

        this.map = this.L.map(this.mapContainer.nativeElement, {
            center: [startCoords.lat, startCoords.lng],
            zoom: 15
        });

        this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Ensure map knows its size
        this.map.invalidateSize();

        // FIX ICONS BEFORE CREATING ANY MARKERS
        this.fixLeafletIcons();

        // Initial marker
        this.setMarker(startCoords.lat, startCoords.lng);

        // Map Click Event
        this.map.on('click', (e: any) => {
            this.setMarker(e.latlng.lat, e.latlng.lng);
            this.locationChange.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
    }

    private setMarker(lat: number, lng: number) {
        if (!this.L) return;

        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            if (this.map) {
                this.marker = this.L.marker([lat, lng], { draggable: true }).addTo(this.map);

                this.marker.on('dragend', (event: any) => {
                    const position = event.target.getLatLng();
                    this.locationChange.emit({ lat: position.lat, lng: position.lng });
                });
            }
        }
    }

    /**
     * Get user's current location using browser Geolocation API
     */
    getCurrentLocation(): void {
        if (!this.isBrowser || !navigator.geolocation) {
            alert('Tu navegador no soporta geolocalización');
            return;
        }

        this.isLocating = true;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Center map on user location
                if (this.map) {
                    this.map.setView([lat, lng], 17); // Zoom in a bit more
                }

                // Set marker and emit event
                this.setMarker(lat, lng);
                this.locationChange.emit({ lat, lng });

                this.isLocating = false;
            },
            (error) => {
                this.isLocating = false;
                let message = 'No se pudo obtener tu ubicación.';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Permiso de ubicación denegado. Por favor habilítalo en tu navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Ubicación no disponible.';
                        break;
                    case error.TIMEOUT:
                        message = 'Se agotó el tiempo de espera para obtener la ubicación.';
                        break;
                }

                alert(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    private fixLeafletIcons() {
        if (!this.L) return;

        // Explicitly set default icon options to use CDN to avoid asset path issues
        const DefaultIcon = this.L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41]
        });

        this.L.Marker.prototype.options.icon = DefaultIcon;
    }

    ngOnDestroy() {
        if (this.map) {
            this.map.remove();
        }
    }
}
