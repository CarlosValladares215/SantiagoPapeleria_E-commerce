import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UiService {
    private isMobileMenuOpenSubject = new BehaviorSubject<boolean>(false);
    isMobileMenuOpen$ = this.isMobileMenuOpenSubject.asObservable();

    private isCartOpenSubject = new BehaviorSubject<boolean>(false);
    isCartOpen$ = this.isCartOpenSubject.asObservable();

    private activeMegaMenuSubject = new BehaviorSubject<string | null>(null);
    activeMegaMenu$ = this.activeMegaMenuSubject.asObservable();

    private cartItemCountSubject = new BehaviorSubject<number>(0);
    cartItemCount$ = this.cartItemCountSubject.asObservable();

    constructor() { }

    toggleMobileMenu() {
        this.isMobileMenuOpenSubject.next(!this.isMobileMenuOpenSubject.value);
        if (this.isMobileMenuOpenSubject.value) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    closeMobileMenu() {
        this.isMobileMenuOpenSubject.next(false);
        document.body.style.overflow = '';
    }

    toggleCart() {
        this.isCartOpenSubject.next(!this.isCartOpenSubject.value);
        if (this.isCartOpenSubject.value) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    closeCart() {
        this.isCartOpenSubject.next(false);
        document.body.style.overflow = '';
    }

    setActiveMegaMenu(menuId: string | null) {
        this.activeMegaMenuSubject.next(menuId);
    }
}
