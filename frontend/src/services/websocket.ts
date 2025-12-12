import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private apiUrl: string;

  constructor() {
    // Используем API URL из переменных окружения или дефолтный
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(`${this.apiUrl}/events`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket подключен');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket отключен');
    });

    this.socket.on('connected', (data: any) => {
      console.log('Соединение установлено:', data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const webSocketService = new WebSocketService();

// Типы событий
export interface TaskCreatedEvent {
  id: number;
  name: string;
  status: string;
}

export interface TaskUpdatedEvent {
  id: number;
  status: string;
}

export interface PcStatusChangedEvent {
  pcId: number;
  isOnline: boolean;
}

export interface AgentRegisteredEvent {
  id: number;
  pcId: number;
  agentId: string;
}

export interface TaskPcStatusChangedEvent {
  taskId: number;
  pcId: number;
  status: string;
}

