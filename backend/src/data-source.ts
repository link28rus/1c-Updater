import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { PC } from './pcs/entities/pc.entity';
import { Group } from './groups/entities/group.entity';
import { Distribution } from './distributions/entities/distribution.entity';
import { Task, TaskPC } from './tasks/entities/task.entity';
import { AgentRegistration } from './agent/entities/agent-registration.entity';

// Переменные окружения загружаются через @nestjs/config в основном приложении
// Для CLI миграций TypeORM может использовать .env файл напрямую
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || '1c_updater',
  entities: [User, PC, Group, Distribution, Task, TaskPC, AgentRegistration],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false, // Миграции вместо synchronize
  logging: process.env.NODE_ENV === 'development',
});




