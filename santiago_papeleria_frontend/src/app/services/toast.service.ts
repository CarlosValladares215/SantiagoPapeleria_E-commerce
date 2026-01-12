import { Injectable, signal, computed } from '@angular/core';

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toastsSignal = signal<ToastMessage[]>([]);
    toasts = computed(() => this.toastsSignal());

    success(message: string) {
        this.add(message, 'success');
    }

    error(message: string) {
        this.add(message, 'error');
    }

    info(message: string) {
        this.add(message, 'info');
    }

    add(message: string, type: 'success' | 'error' | 'info') {
        const id = Date.now();
        this.toastsSignal.update(prev => [...prev, { id, message, type }]);
        setTimeout(() => this.remove(id), 3000);
    }

    remove(id: number) {
        this.toastsSignal.update(prev => prev.filter(t => t.id !== id));
    }
}
