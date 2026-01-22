// src/app/features/chatbot/services/chat-session.service.ts

import { Injectable } from '@angular/core';

/**
 * ChatSessionService - Manages session persistence.
 * 
 * Responsibilities:
 * - Generate and persist sessionId
 * - Clear session on logout
 * - Isolated from business logic for testability
 */
@Injectable({
    providedIn: 'root'
})
export class ChatSessionService {
    private readonly STORAGE_KEY = 'chatbot_session_id';

    /**
     * Get existing sessionId or create a new one
     */
    getSessionId(): string {
        let sessionId = localStorage.getItem(this.STORAGE_KEY);
        if (!sessionId) {
            sessionId = this.generateSessionId();
            localStorage.setItem(this.STORAGE_KEY, sessionId);
        }
        return sessionId;
    }

    /**
     * Clear the current session (for logout or reset)
     */
    clearSession(): void {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    /**
     * Force a new session (for explicit reset)
     */
    resetSession(): string {
        this.clearSession();
        return this.getSessionId();
    }

    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 11);
        return `${timestamp}-${randomPart}`;
    }
}
