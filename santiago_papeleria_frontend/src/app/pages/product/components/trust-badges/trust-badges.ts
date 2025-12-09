import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-trust-badges',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './trust-badges.html',
    styleUrls: ['./trust-badges.scss']
})
export class TrustBadges {
    badges = [
        {
            icon: 'ri-truck-line',
            iconColor: 'text-[#104D73]',
            title: 'Envío Gratis',
            subtitle: 'Pedidos +$50'
        },
        {
            icon: 'ri-shield-check-line',
            iconColor: 'text-green-500',
            title: 'Garantía',
            subtitle: '30 días'
        },
        {
            icon: 'ri-customer-service-2-line',
            iconColor: 'text-blue-500',
            title: 'Soporte',
            subtitle: '24/7'
        }
    ];
}
