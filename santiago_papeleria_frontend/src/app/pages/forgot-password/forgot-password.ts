import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [FormsModule, CommonModule, RouterLink],
    templateUrl: './forgot-password.html',
    styleUrl: './forgot-password.scss'
})
export class ForgotPassword {
    email = '';
    isLoading = false;
    isSent = false;

    constructor(private router: Router) { }

    handleSubmit() {
        this.isLoading = true;
        setTimeout(() => {
            this.isLoading = false;
            this.isSent = true;
        }, 1500);
    }
}
