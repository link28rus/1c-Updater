import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task, TaskPC } from './entities/task.entity';
import { DistributionsModule } from '../distributions/distributions.module';
import { PcsModule } from '../pcs/pcs.module';
import { EventsModule } from '../common/gateways/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskPC]),
    DistributionsModule,
    PcsModule,
    forwardRef(() => EventsModule),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}




