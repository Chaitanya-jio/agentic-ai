import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private sessionId: string;
  private clientId: string | undefined;

  constructor() {
    // Try to get existing session ID from storage
    const existingSession = localStorage.getItem('user_session_id');
    const existingClient = localStorage.getItem('user_client_id');
    if (existingSession) {
      this.sessionId = existingSession;
    } else {
      // Generate new session ID if none exists
      this.sessionId = this.generateSessionId();
      this.clientId = this.generateClientId();
      localStorage.setItem('user_session_id', this.sessionId);
      localStorage.setItem('user_client_id', this.clientId);
    }
  }

  private generateClientId(): string {
    // Generate a timestamp-based unique ID
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 10);
    return `user-${timestamp}-${random}`;
  }

  private generateSessionId(): string {
    // Generate a timestamp-based unique ID
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 15);
    return `user-${timestamp}-${random}`;
  }

  getSessionId(): string {
    return this.sessionId;
  }
  getClientId(): string {
    return this.clientId ?? this.generateClientId();
  }
}