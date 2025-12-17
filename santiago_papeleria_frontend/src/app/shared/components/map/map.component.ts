import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import * as L from 'leaflet';

@Component({
    selector: 'app-map',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="map-container" #mapContainer></div>
  `,
    styles: [`
    .map-container {
      width: 100%;
      height: 400px; /* Increased height */
      border-radius: 8px;
      z-index: 1;
      display: block;
    }
  `]
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() initialLocation: { lat: number, lng: number } | null = null;
    @Output() locationChange = new EventEmitter<{ lat: number, lng: number }>();

    @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

    private map: L.Map | undefined;
    private marker: L.Marker | undefined;

    // Santiago Papelería Default Coords (Loja, Ecuador)
    private readonly DEFAULT_COORDS = { lat: -3.99313, lng: -79.20422 };

    constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

    ngOnInit() {
        // Leaflet requires window, so we wait for browser
    }

    ngAfterViewInit() {
        if (isPlatformBrowser(this.platformId)) {
            // Slight delay to ensure container is rendered and has dimensions (especially inside *ngIf or tabs)
            setTimeout(() => {
                this.initMap();
            }, 100);
        }
    }

    private initMap() {
        if (!this.mapContainer) return;

        const startCoords = this.initialLocation || this.DEFAULT_COORDS;

        this.map = L.map(this.mapContainer.nativeElement, {
            center: [startCoords.lat, startCoords.lng],
            zoom: 15
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Ensure map knows its size
        this.map.invalidateSize();

        // Initial marker
        this.setMarker(startCoords.lat, startCoords.lng);

        // Map Click Event
        this.map.on('click', (e: L.LeafletMouseEvent) => {
            this.setMarker(e.latlng.lat, e.latlng.lng);
            this.locationChange.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        this.fixLeafletIcons();
    }

    private setMarker(lat: number, lng: number) {
        if (this.marker) {
            this.marker.setLatLng([lat, lng]);
        } else {
            if (this.map) {
                this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);

                this.marker.on('dragend', (event) => {
                    const position = event.target.getLatLng();
                    this.locationChange.emit({ lat: position.lat, lng: position.lng });
                });
            }
        }
    }

    private fixLeafletIcons() {
        // Explicitly set default icon options to use CDN to avoid asset path issues
        const DefaultIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41]
        });

        L.Marker.prototype.options.icon = DefaultIcon;
    }

    ngOnDestroy() {
        if (this.map) {
            this.map.remove();
        }
    }
}
