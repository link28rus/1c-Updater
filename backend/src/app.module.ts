import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PcsModule } from './pcs/pcs.module';
import { GroupsModule } from './groups/groups.module';
import { DistributionsModule } from './distributions/distributions.module';
import { TasksModule } from './tasks/tasks.module';
import { AgentModule } from './agent/agent.module';
import { EventsModule } from './common/gateways/events.module';
import { ReportsModule } from './reports/reports.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || '1c_updater',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Отключено из-за проблем с миграциями существующих данных
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    UsersModule,
    PcsModule,
    GroupsModule,
    DistributionsModule,
    TasksModule,
    AgentModule,
    EventsModule,
    ReportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
