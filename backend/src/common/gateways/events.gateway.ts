import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket, Namespace } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
}

@Injectable()
export class EventsGateway implements OnModuleInit, OnModuleDestroy {
  private io: Server | null = null;
  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(private jwtService: JwtService) {}

  onModuleInit() {
    // Инициализация будет происходить через setServer из main.ts
    this.logger.log('EventsGateway инициализирован');
  }

  onModuleDestroy() {
    if (this.io) {
      this.io.close();
    }
  }

  setServer(io: Server) {
    this.io = io;

    // Namespace для событий
    const eventsNamespace = io.of('/events');

    eventsNamespace.on('connection', (client: Socket) => {
      this.handleConnection(client, eventsNamespace);
    });

    this.logger.log('WebSocket сервер настроен для namespace /events');
  }

  private async handleConnection(client: Socket, namespace: Namespace) {
    const authClient = client as AuthenticatedSocket;
    try {
      // Проверяем JWT токен из query параметра или auth
      const token = client.handshake.auth?.token || (client.handshake.query?.token as string);
      
      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          authClient.userId = payload.sub;
          authClient.username = payload.username;
          this.connectedClients.set(client.id, authClient);
          this.logger.log(`Клиент подключен: ${authClient.username} (${client.id})`);
          client.emit('connected', { message: 'Подключено к серверу' });
        } catch (error) {
          this.logger.warn(`Невалидный токен для клиента ${client.id}`);
          client.disconnect();
          return;
        }
      } else {
        // Публичные события могут быть доступны без токена
        this.connectedClients.set(client.id, authClient);
        this.logger.log(`Анонимный клиент подключен: ${client.id}`);
      }

      client.on('disconnect', () => {
        this.connectedClients.delete(client.id);
        this.logger.log(`Клиент отключен: ${client.id}`);
      });
    } catch (error) {
      this.logger.error(`Ошибка подключения клиента: ${error}`);
      client.disconnect();
    }
  }

  // Отправка события всем подключенным клиентам
  emitToAll(event: string, data: any) {
    if (this.io) {
      this.io.of('/events').emit(event, data);
    }
  }

  // Отправка события конкретному пользователю
  emitToUser(userId: number, event: string, data: any) {
    if (!this.io) return;
    const eventsNamespace = this.io.of('/events');
    for (const [socketId, socket] of this.connectedClients) {
      if (socket.userId === userId) {
        const clientSocket = eventsNamespace.sockets.get(socketId);
        if (clientSocket) {
          clientSocket.emit(event, data);
        }
      }
    }
  }

  // События для отправки:
  
  // Задача создана
  taskCreated(task: any) {
    this.emitToAll('task:created', task);
  }

  // Задача обновлена
  taskUpdated(task: any) {
    this.emitToAll('task:updated', task);
  }

  // ПК онлайн/офлайн
  pcStatusChanged(pcId: number, isOnline: boolean) {
    this.emitToAll('pc:status_changed', { pcId, isOnline });
  }

  // Агент зарегистрирован
  agentRegistered(agent: any) {
    this.emitToAll('agent:registered', agent);
  }

  // Статус задачи для ПК изменился
  taskPcStatusChanged(taskId: number, pcId: number, status: string) {
    this.emitToAll('task_pc:status_changed', { taskId, pcId, status });
  }
}
