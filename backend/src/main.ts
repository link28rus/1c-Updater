import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { EventsModule } from './common/gateways/events.module';
import { EventsGateway } from './common/gateways/events.gateway';
import { Server } from 'socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api');

  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  };

  app.enableCors(corsOptions);

  const port = process.env.PORT || 3000;
  const server = await app.listen(port);
  
  // Настройка Socket.io
  const io = new Server(server, {
    cors: corsOptions,
    path: '/socket.io',
  });

  // Инициализация EventsGateway
  try {
    const moduleRef = app.select(EventsModule);
    const eventsGateway = moduleRef.get(EventsGateway);
    if (eventsGateway) {
      eventsGateway.setServer(io);
      console.log('EventsGateway инициализирован');
    }
  } catch (error) {
    console.warn('Не удалось инициализировать EventsGateway:', error);
  }

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`WebSocket events available at: ws://localhost:${port}/events`);
}
bootstrap();

