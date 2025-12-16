import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

@Component({
    selector: 'app-toast-container',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      <div *ngFor="let toast of toasts()" 
           class="min-w-[300px] p-4 rounded-lg shadow-lg flex items-center justify-between text-white animate-fade-in-down transition-all"
           [ngClass]="{
             'bg-green-600': toast.type === 'success',
             'bg-red-600': toast.type === 'error',
             'bg-blue-600': toast.type === 'info'
           }">
         <span class="flex items-center gap-2">
           <i [class]="getIcon(toast.type)"></i>
           {{ toast.message }}
         </span>
         <button (click)="remove(toast.id)" class="ml-4 hover:opacity-75">
           <i class="ri-close-line"></i>
         </button>
      </div>
    </div>
  `,
    styles: [`
    .animate-fade-in-down {
      animation: fadeInDown 0.3s ease-out;
    }
    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ToastContainerComponent {
    private toastsSignal = signal<ToastMessage[]>([]);
    toasts = computed(() => this.toastsSignal());

    add(message: string, type: 'success' | 'error' | 'info' = 'success') {
        const id = Date.now();
        this.toastsSignal.update(prev => [...prev, { id, message, type }]);
        setTimeout(() => this.remove(id), 3000);
    }

    remove(id: number) {
        this.toastsSignal.update(prev => prev.filter(t => t.id !== id));
    }

    getIcon(type: string) {
        switch (type) {
            case 'success': return 'ri-checkbox-circle-line';
            case 'error': return 'ri-error-warning-line';
            default: return 'ri-information-line';
        }
    }
}
