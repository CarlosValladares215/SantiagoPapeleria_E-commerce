import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalType = 'success' | 'error' | 'warning';

@Component({
    selector: 'app-unified-feedback-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './unified-feedback-modal.component.html',
    styleUrls: ['./unified-feedback-modal.component.scss'] // Keeping scss if needed later
})
export class UnifiedFeedbackModalComponent {
    @Input() isOpen = false;
    @Input() type: ModalType = 'success';
    @Input() title = '';
    @Input() message = '';
    @Input() actionText = 'Continuar';

    @Output() action = new EventEmitter<void>();

    onAction() {
        this.action.emit();
    }
}
