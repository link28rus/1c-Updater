import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() createTaskDto: CreateTaskDto) {
    try {
      console.log('[TasksController] Создание задачи:', createTaskDto);
      const result = await this.tasksService.create(createTaskDto);
      console.log('[TasksController] Задача создана успешно:', result.id);
      return result;
    } catch (error) {
      console.error('[TasksController] Ошибка создания задачи:', error);
      throw error;
    }
  }

  @Get()
  findAll() {
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Get(':id/status')
  getTaskStatus(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.getTaskPcStatuses(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }
}




