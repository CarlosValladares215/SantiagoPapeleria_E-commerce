import { Component, OnInit, signal } from '@angular/core';
import { PromocionesService } from '../../../services/promociones.service';
import { Promocion } from '../../../models/promocion.model';

@Component({
    selector: 'app-promocion-list',
    templateUrl: './promocion-list.component.html',
    standalone: false
})
export class PromocionListComponent implements OnInit {
    promociones = signal<Promocion[]>([]);
    loading = signal<boolean>(false);

    constructor(private promocionesService: PromocionesService) { }

    ngOnInit(): void {
        this.loadPromociones();
    }

    loadPromociones() {
        this.loading.set(true);
        this.promocionesService.getAll().subscribe({
            next: (data: Promocion[]) => {
                this.promociones.set(data);
                this.loading.set(false);
            },
            error: (err: any) => {
                console.error(err);
                this.loading.set(false);
            }
        });
    }

    delete(id: string) {
        if (confirm('¿Estás seguro de eliminar esta promoción?')) {
            this.promocionesService.delete(id).subscribe(() => this.loadPromociones());
        }
    }
}
