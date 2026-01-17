import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class TimeService implements OnDestroy {
    // Signal that emits current timestamp every second
    now = signal<number>(Date.now());

    private intervalId: any;

    constructor() {
        this.startTicker();
    }

    private startTicker() {
        // Run outside Angular zone if performance is critical, 
        // but for 1 sec resolution, standard zone is usually fine unless app is huge.
        // Keeping it simple for now.
        this.intervalId = setInterval(() => {
            this.now.set(Date.now());
        }, 1000);
    }

    ngOnDestroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
}
