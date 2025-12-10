import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Task, TaskPC } from '../tasks/entities/task.entity';
import { PC } from '../pcs/entities/pc.entity';
import { AgentRegistration } from '../agent/entities/agent-registration.entity';
import { Distribution } from '../distributions/entities/distribution.entity';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskPC,
      PC,
      AgentRegistration,
      Distribution,
      User,
      Group,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

