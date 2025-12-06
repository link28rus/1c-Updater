import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentRegistration } from './entities/agent-registration.entity';
import { TasksModule } from '../tasks/tasks.module';
import { PcsModule } from '../pcs/pcs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentRegistration]),
    TasksModule,
    PcsModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}




