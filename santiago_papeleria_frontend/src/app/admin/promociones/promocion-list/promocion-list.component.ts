import { Component, OnInit, signal } from '@angular/core';
import { PromocionesService } from '../../../services/promociones.service';
import { Promocion } from '../../../models/promocion.model';
import Swal, { SweetAlertResult } from 'sweetalert2';

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
        Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto. Si la promoción tiene pedidos pendientes, no se podrá eliminar.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result: SweetAlertResult) => {
            if (result.isConfirmed) {
                this.loading.set(true);
                this.promocionesService.delete(id).subscribe({
                    next: () => {
                        this.loading.set(false);
                        Swal.fire(
                            '¡Eliminado!',
                            'La promoción ha sido eliminada.',
                            'success'
                        );
                        this.loadPromociones();
                    },
                    error: (err) => {
                        this.loading.set(false);
                        console.error('Delete error:', err);

                        let msg = 'Hubo un error al eliminar la promoción.';
                        if (err.status === 409) {
                            msg = 'No se puede eliminar: Hay pedidos pendientes asociados (Regla de negocio).';
                        } else if (err.error?.message) {
                            msg = err.error.message;
                        }

                        Swal.fire(
                            'Error',
                            msg,
                            'error'
                        );
                    }
                });
            }
        });
    }
}
