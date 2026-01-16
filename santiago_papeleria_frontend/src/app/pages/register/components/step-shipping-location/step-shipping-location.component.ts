import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, ControlContainer } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MapComponent } from '../../../../shared/components/map/map.component';

@Component({
  selector: 'app-step-shipping-location',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MapComponent],
  templateUrl: './step-shipping-location.html',
  styleUrl: './step-shipping-location.scss',
})
export class StepShippingLocationComponent {
  parentForm = inject(ControlContainer).control as FormGroup;
  private http = inject(HttpClient);

  @Input() isSubmitting = false;
  @Output() submit = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  provincias = [
    'Azuay', 'Bolívar', 'Cañar', 'Carchi', 'Chimborazo', 'Cotopaxi', 'El Oro', 'Esmeraldas', 'Galápagos',
    'Guayas', 'Imbabura', 'Loja', 'Los Ríos', 'Manabí', 'Morona Santiago', 'Napo', 'Orellana', 'Pastaza',
    'Pichincha', 'Santa Elena', 'Santo Domingo de los Tsáchilas', 'Sucumbíos', 'Tungurahua', 'Zamora Chinchipe'
  ];

  /**
   * Called when user clicks or drags the map marker
   */
  onLocationChange(coords: { lat: number; lng: number }) {
    // Update lat/lng in form
    const addressGroup = this.parentForm.get('direcciones_entrega');
    addressGroup?.patchValue({
      lat: coords.lat,
      lng: coords.lng
    });

    // Reverse Geocoding - auto-fill address fields
    this.getAddressFromCoords(coords.lat, coords.lng);
  }

  /**
   * Reverse geocoding using Nominatim (OpenStreetMap)
   */
  private getAddressFromCoords(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (data && data.address) {
          const addr = data.address;

          // Street: road || pedestrian || suburb
          const road = addr.road || addr.pedestrian || addr.suburb || '';
          const houseNumber = addr.house_number ? ` ${addr.house_number}` : '';
          const calle = `${road}${houseNumber}`;

          // City: city || town || village || county
          const city = addr.city || addr.town || addr.village || addr.county || '';

          // Province: state || region
          const province = addr.state || addr.region || '';

          // Update form fields
          const addressGroup = this.parentForm.get('direcciones_entrega');
          addressGroup?.patchValue({
            calle_principal: calle,
            ciudad: city,
            provincia: this.matchProvince(province)
          });
        }
      },
      error: (err) => console.error('Geocoding error', err)
    });
  }

  private matchProvince(incoming: string): string {
    const found = this.provincias.find(p => p.toLowerCase() === incoming.toLowerCase());
    return found || incoming;
  }

  onSubmit() {
    this.submit.emit();
  }

  onBack() {
    this.back.emit();
  }
}
