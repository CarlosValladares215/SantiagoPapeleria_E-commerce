import { Component, Input, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-welcome-email-preview',
    standalone: true,
    imports: [CommonModule],
    encapsulation: ViewEncapsulation.ShadowDom,
    templateUrl: './welcome-email-preview.component.html',
    styleUrls: ['./welcome-email-preview.component.scss']
})
export class WelcomeEmailPreviewComponent {
    @Input() userName: string = '';
    @Input() verificationCode: string = '';
    @Input() verificationLink: string = '';
}
