import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart/cart.service';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { DireccionEntrega } from '../../models/usuario.model';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './cart.html',
    styleUrl: './cart.scss'
})
export class Cart {
    cartService = inject(CartService);
    authService = inject(AuthService);
    router = inject(Router);

    addresses = computed(() => this.authService.user()?.direcciones_entrega || []);

    increaseQuantity(itemId: string, currentQty: number) {
        this.cartService.updateQuantity(itemId, currentQty + 1);
    }

    decreaseQuantity(itemId: string, currentQty: number) {
        if (currentQty > 1) {
            this.cartService.updateQuantity(itemId, currentQty - 1);
        }
    }

    removeItem(itemId: string) {
        this.cartService.removeFromCart(itemId);
    }

    onAddressChange(event: any) {
        // The value of event.target.value might be the index or ID. 
        // Let's use index for simplicity if no IDs, or passed value.
        const index = event.target.value;
        if (index !== '' && index !== null) {
            const addr = this.addresses()[index];
            this.cartService.setAddress(addr);
        } else {
            this.cartService.setAddress(null);
        }
    }

    addNewAddress() {
        this.router.navigate(['/profile'], { queryParams: { tab: 'addresses', action: 'new' } });
    }

    isProcessing = false;

    setDelivery(method: 'shipping' | 'pickup') {
        this.cartService.setDeliveryMethod(method);
    }

    setPayment(method: 'transfer' | 'cash') {
        this.cartService.setPaymentMethod(method);
        this.selectedFile = null; // Reset file on change
    }

    selectedFile: File | null = null;

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
        }
    }

    confirmOrder() {
        // 1. Validation
        if (this.cartService.cartItems().length === 0) return;

        const delivery = this.cartService.deliveryMethod();
        const payment = this.cartService.paymentMethod();
        const address = this.cartService.selectedAddress();

        if (delivery === 'shipping' && !address) {
            alert('Por favor selecciona una dirección de envío');
            return;
        }

        if (!payment) {
            alert('Por favor selecciona un método de pago');
            return;
        }

        if (payment === 'transfer' && !this.selectedFile) {
            alert('Por favor sube el comprobante de transferencia para continuar.');
            return;
        }

        // 2. Simulation
        this.isProcessing = true;

        setTimeout(() => {
            this.isProcessing = false;

            let message = '¡Pedido Confirmado!\n\n';
            if (payment === 'transfer') {
                message += 'Gracias. Hemos recibido tu comprobante. Lo verificaremos y procesaremos tu pedido.';
            } else {
                message += 'Gracias por tu compra. Tu pedido ha sido registrado. Pagarás al momento de la entrega/retiro.';
            }

            alert(message);

            // 3. Cleanup
            this.cartService.clearCart();
            this.router.navigate(['/products']);

        }, 2500);
    }
}

