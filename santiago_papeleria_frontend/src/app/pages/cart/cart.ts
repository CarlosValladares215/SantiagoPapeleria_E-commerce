import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart/cart.service';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { DireccionEntrega } from '../../models/usuario.model';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';

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
    toastService = inject(ToastService);

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

    clearCart() {
        if (confirm('¿Estás seguro de que deseas vaciar tu carrito?')) {
            this.cartService.clearCart();
        }
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
        if (!this.authService.user()) {
            this.toastService.info('Debes iniciar sesión para agregar una dirección.');
            this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
            return;
        }
        this.router.navigate(['/profile'], { queryParams: { tab: 'addresses', action: 'new' } });
    }

    isProcessing = signal(false);

    setDelivery(method: 'shipping' | 'pickup') {
        this.cartService.setDeliveryMethod(method);
    }

    onBranchChange(event: any) {
        const branchId = Number(event.target.value);
        const branch = this.cartService.branches.find(b => b.id === branchId);
        if (branch) {
            this.cartService.selectedBranch.set(branch);
        }
    }

    setPayment(method: 'transfer' | 'cash') {
        this.cartService.setPaymentMethod(method);
        this.selectedFile = null; // Reset file on change
    }

    selectedFile: File | null = null;
    showConfirmModal = signal(false); // Modal de pregunta
    showSuccessModal = signal(false); // Modal de éxito

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
        const user = this.authService.user();

        if (!user) {
            this.toastService.info('Debes iniciar sesión para realizar un pedido.');
            this.router.navigate(['/login']);
            return;
        }

        if (delivery === 'shipping' && !address) {
            this.toastService.info('Por favor selecciona una dirección de envío');
            return;
        }

        if (!payment) {
            this.toastService.info('Por favor selecciona un método de pago');
            return;
        }

        if (payment === 'transfer' && !this.selectedFile) {
            this.toastService.info('Por favor sube el comprobante de transferencia para continuar.');
            return;
        }

        // 2. Pre-Confirmation
        this.showConfirmModal.set(true);
    }

    // Logic to execute AFTER user confirms in modal
    processOrderConfirmed() {
        this.showConfirmModal.set(false);
        this.isProcessing.set(true);

        const delivery = this.cartService.deliveryMethod();
        const payment = this.cartService.paymentMethod();
        const address = this.cartService.selectedAddress();
        const user = this.authService.user();

        if (!user) { // Should check again just in case
            this.isProcessing.set(false);
            return;
        }

        const processOrder = (transferUrl: string | null) => {
            const items = this.cartService.cartItems().map(i => ({
                codigo_dobranet: i.sku || 'GENERICO', // Fallback
                nombre: i.name,
                cantidad: i.quantity,
                precio_unitario_aplicado: i.price,
                subtotal: i.price * i.quantity,
                impuesto_iva: 0
            }));

            // Calculate totals
            const subtotal = this.cartService.totalValue();
            const shipping = this.cartService.shippingCost();
            const total = this.cartService.finalTotal();

            // Build Payload matching CreatePedidoDto
            const orderPayload = {
                usuario_id: user._id || (user as any).id,
                estado_pedido: payment === 'transfer' ? 'PENDIENTE_PAGO' : 'PENDIENTE',
                fecha_compra: new Date().toISOString(),
                items: items,
                resumen_financiero: {
                    subtotal_sin_impuestos: subtotal,
                    total_impuestos: 0,
                    costo_envio: shipping,
                    total_pagado: total,
                    metodo_pago: payment === 'transfer' ? 'TRANSFERENCIA' : 'EFECTIVO',
                    comprobante_pago: transferUrl
                },
                datos_envio: {
                    courier: delivery === 'shipping' ? 'Propio' : null,
                    guia_tracking: delivery === 'shipping' ? 'PENDIENTE' : null,
                    direccion_destino: delivery === 'shipping' && address ? {
                        calle: address.calle_principal,
                        ciudad: address.ciudad,
                        provincia: address.provincia,
                        codigo_postal: address.codigo_postal,
                        referencia: address.referencia
                    } : null
                }
            };

            this.cartService.createOrder(orderPayload).subscribe({
                next: (res: any) => {
                    setTimeout(() => {
                        this.isProcessing.set(false);
                        this.showSuccessModal.set(true);
                    });
                },
                error: (err) => {
                    console.error('Error creando pedido', err);
                    setTimeout(() => {
                        this.isProcessing.set(false);
                        const msg = err.error?.message || (Array.isArray(err.error?.message) ? err.error.message.join(', ') : 'Ocurrió un error al procesar tu pedido.');
                        this.toastService.error(msg);
                    });
                }
            });
        };

        if (payment === 'transfer' && this.selectedFile) {
            this.cartService.uploadTransferProof(this.selectedFile).subscribe({
                next: (res) => {
                    processOrder(res.url);
                },
                error: (err) => {
                    console.error('Upload error', err);
                    setTimeout(() => {
                        this.isProcessing.set(false);
                        this.toastService.error('Error al subir el comprobante. Inténtalo de nuevo.');
                    });
                }
            });
        } else {
            processOrder(null);
        }
    }

    cancelOrder() {
        this.showConfirmModal.set(false);
        this.isProcessing.set(false);
    }

    closeModalAndRedirect() {
        this.showSuccessModal.set(false);
        this.cartService.clearCart();
        this.router.navigate(['/orders']);
    }
}
