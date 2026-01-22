import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    type?: 'text' | 'products' | 'order_status' | 'options';
    content?: any;
}

import { AuthService } from '../../services/auth/auth.service';

@Injectable({
    providedIn: 'root'
})
export class ChatbotService {
    private apiUrl = `${environment.baseApiUrl}/chatbot`;

    messages = signal<ChatMessage[]>([]);
    isOpen = signal<boolean>(false);

    constructor(private http: HttpClient, private authService: AuthService) {
        // Initial welcome message
        this.addBotMessage('¡Hola! Soy el asistente virtual de Santiago Papelería. ¿En qué puedo ayudarte hoy?');
    }

    toggleChat() {
        this.isOpen.update(value => !value);
    }

    sendMessage(text: string) {
        this.addUserMessage(text);

        const currentUser = this.authService.user();
        const payload = {
            message: text,
            userId: currentUser ? currentUser._id : undefined
        };

        // Connect to backend
        this.http.post<any>(`${this.apiUrl}/message`, payload).subscribe({
            next: (response) => {
                this.addBotMessage(response.text, response.type, response.content);
            },
            error: (err) => {
                console.error('Error sending message', err);
                this.addBotMessage('Lo siento, tuve un problema al procesar tu mensaje. Por favor intenta más tarde.');
            }
        });
    }

    private addUserMessage(text: string) {
        this.messages.update(msgs => [...msgs, {
            text,
            sender: 'user',
            timestamp: new Date()
        }]);
    }

    private addBotMessage(text: string, type: 'text' | 'products' | 'order_status' | 'options' = 'text', content?: any) {
        this.messages.update(msgs => [...msgs, {
            text,
            sender: 'bot',
            timestamp: new Date(),
            type,
            content
        }]);
    }
}
