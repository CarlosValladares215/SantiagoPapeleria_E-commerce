// src/app/features/chatbot/services/chat-api.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ChatRequest, ChatResponse, ChatHealthResponse } from '../models/chat.models';

/**
 * ChatApiService - Handles all HTTP communication with the chatbot backend.
 * 
 * Responsibilities:
 * - Send messages to backend
 * - Check backend health
 * - Handle API errors gracefully
 * 
 * Does NOT manage state - that's ChatStateService's job.
 */
@Injectable({
    providedIn: 'root'
})
export class ChatApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.baseApiUrl}/chatbot`;
    private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

    /**
     * Send a message to the chatbot backend
     */
    sendMessage(request: ChatRequest): Observable<ChatResponse> {
        return this.http.post<ChatResponse>(`${this.baseUrl}/message`, request).pipe(
            timeout(this.REQUEST_TIMEOUT),
            catchError(error => {
                console.error('[ChatApiService] Error sending message:', error);
                // Return fallback response instead of throwing
                return of({
                    text: 'Lo siento, tuve un problema al procesar tu mensaje. Por favor intenta más tarde.',
                    type: 'options' as const,
                    content: ['Intentar de nuevo', 'Hablar con un agente']
                });
            })
        );
    }

    /**
     * Check if chatbot backend is healthy
     */
    checkHealth(): Observable<ChatHealthResponse | null> {
        return this.http.get<ChatHealthResponse>(`${this.baseUrl}/health`).pipe(
            timeout(5000),
            catchError(() => of(null))
        );
    }
}
