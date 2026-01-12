import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BankAccount {
    _id?: string;
    bankName: string;
    type: 'Ahorros' | 'Corriente';
    accountNumber: string;
    ownerName: string;
    ownerId: string;
    isActive: boolean;
}

export interface PaymentConfig {
    transferActive: boolean;
    cashActive: boolean;
    pickupActive: boolean;
    bankAccounts: BankAccount[];
    cashConfig: {
        maxAmount: number;
        restrictedZones: string[];
    };
}

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private http = inject(HttpClient);
    // Adjust base URL if needed. Assuming /api/payments based on backend controller @Controller('payments')
    // environment.apiUrl is usually .../api/productos, so get base
    private apiUrl = environment.apiUrl.replace('/productos', '') + '/payments';

    getConfig(): Observable<PaymentConfig> {
        return this.http.get<PaymentConfig>(`${this.apiUrl}/config`);
    }

    updateConfig(data: Partial<PaymentConfig>): Observable<PaymentConfig> {
        return this.http.put<PaymentConfig>(`${this.apiUrl}/config`, data);
    }

    addBankAccount(account: Partial<BankAccount>): Observable<PaymentConfig> {
        return this.http.post<PaymentConfig>(`${this.apiUrl}/bank-accounts`, account);
    }

    updateBankAccount(number: string, account: Partial<BankAccount>): Observable<PaymentConfig> {
        return this.http.put<PaymentConfig>(`${this.apiUrl}/bank-accounts/${number}`, account);
    }

    removeBankAccount(number: string): Observable<PaymentConfig> {
        return this.http.delete<PaymentConfig>(`${this.apiUrl}/bank-accounts/${number}`);
    }
}
