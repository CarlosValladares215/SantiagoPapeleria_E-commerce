import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ShippingMethod {
    title: string;
    description: string;
    borderColor: string;
}

interface PaymentMethod {
    icon: string;
    iconColor: string;
    label: string;
}

@Component({
    selector: 'app-shipping-info',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './shipping-info.html',
    styleUrls: ['./shipping-info.scss']
})
export class ShippingInfo {
    shippingMethods: ShippingMethod[] = [
        {
            title: 'Envío Nacional',
            description: '1-3 días hábiles • Gratis en pedidos +$50',
            borderColor: 'border-[#104D73]'
        },
        {
            title: 'Envío Express',
            description: '24-48 horas • $5.99',
            borderColor: 'border-green-500'
        },
        {
            title: 'Retiro en Tienda',
            description: 'Disponible en 2 horas • Gratis',
            borderColor: 'border-yellow-500'
        }
    ];

    paymentMethods: PaymentMethod[] = [
        { icon: 'ri-bank-card-line', iconColor: 'text-[#104D73]', label: 'Tarjetas de crédito' },
        { icon: 'ri-paypal-line', iconColor: 'text-blue-500', label: 'PayPal' },
        { icon: 'ri-money-dollar-circle-line', iconColor: 'text-green-500', label: 'Transferencia' },
        { icon: 'ri-store-line', iconColor: 'text-orange-500', label: 'Pago contra entrega' }
    ];
}
