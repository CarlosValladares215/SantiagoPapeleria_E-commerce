import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-notification-toast',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification-toast.html',
    styleUrls: ['./notification-toast.scss']
})
export class NotificationToast implements OnChanges {
    @Input() message: string = '';
    @Input() show: boolean = false;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['show'] && this.show) {
            // Auto-dismiss after 3 seconds
            setTimeout(() => {
                // Note: Parent component should handle setting show to false
            }, 3000);
        }
    }
}
