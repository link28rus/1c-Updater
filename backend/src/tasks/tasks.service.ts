import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task, TaskPC, TaskStatus, TaskPcStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { DistributionsService } from '../distributions/distributions.service';
import { PcsService } from '../pcs/pcs.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(TaskPC)
    private taskPcRepository: Repository<TaskPC>,
    private distributionsService: DistributionsService,
    private pcsService: PcsService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    try {
      console.log('[TasksService] Создание задачи:', {
        name: createTaskDto.name,
        distributionId: createTaskDto.distributionId,
        pcIds: createTaskDto.pcIds,
      });

      // Проверяем существование дистрибутива
      console.log('[TasksService] Проверка дистрибутива:', createTaskDto.distributionId);
      const distribution = await this.distributionsService.findOne(
        createTaskDto.distributionId,
      );
      console.log('[TasksService] Дистрибутив найден:', distribution?.id);

      // Проверяем существование ПК
      console.log('[TasksService] Проверка ПК:', createTaskDto.pcIds);
      const pcs = await this.pcsService.findAll();
      console.log('[TasksService] Всего ПК в системе:', pcs.length);
      
      const selectedPcs = pcs.filter((pc) =>
        createTaskDto.pcIds.includes(pc.id),
      );
      console.log('[TasksService] Найдено ПК:', selectedPcs.length, 'из', createTaskDto.pcIds.length);

      if (selectedPcs.length !== createTaskDto.pcIds.length) {
        const missingIds = createTaskDto.pcIds.filter(
          (id) => !selectedPcs.some((pc) => pc.id === id),
        );
        console.error('[TasksService] ПК не найдены:', missingIds);
        throw new NotFoundException(
          `Один или несколько ПК не найдены: ${missingIds.join(', ')}`,
        );
      }

      console.log('[TasksService] Создание записи задачи...');
      const task = this.tasksRepository.create({
        name: createTaskDto.name,
        description: createTaskDto.description,
        distributionId: createTaskDto.distributionId,
        status: TaskStatus.PENDING,
      });

      const savedTask = await this.tasksRepository.save(task);
      console.log('[TasksService] Задача сохранена:', savedTask.id);

      // Создаем связи с ПК
      console.log('[TasksService] Создание связей с ПК...');
      const taskPcRecords = selectedPcs.map((pc) =>
        this.taskPcRepository.create({
          taskId: savedTask.id,
          pcId: pc.id,
          status: TaskPcStatus.PENDING,
        }),
      );

      await this.taskPcRepository.save(taskPcRecords);
      console.log('[TasksService] Связи с ПК созданы:', taskPcRecords.length);

      // Загружаем задачу с relations
      console.log('[TasksService] Загрузка задачи с relations...');
      try {
        const result = await this.findOne(savedTask.id);
        console.log('[TasksService] Задача создана успешно:', result.id);
        return result;
      } catch (findError) {
        console.error('[TasksService] Ошибка при загрузке задачи с relations:', findError);
        // Если не удалось загрузить с relations, возвращаем сохраненную задачу
        console.log('[TasksService] Возвращаем задачу без relations');
        return savedTask;
      }
    } catch (error) {
      console.error('[TasksService] Ошибка создания задачи:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw error;
    }
  }

  async findAll(): Promise<Task[]> {
    try {
      return await this.tasksRepository.find({
        relations: ['distribution', 'pcs'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('Error loading tasks with relations:', error);
      // Fallback: load without relations
      return await this.tasksRepository.find({
        order: { createdAt: 'DESC' },
      });
    }
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['distribution', 'pcs'],
    });

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    return task;
  }

  async getTaskPcStatuses(taskId: number): Promise<TaskPC[]> {
    return this.taskPcRepository.find({
      where: { taskId },
      relations: ['pc'],
    });
  }

  async updateTaskPcStatus(
    taskId: number,
    pcId: number,
    status: TaskPcStatus,
    errorMessage?: string,
  ): Promise<void> {
    const taskPc = await this.taskPcRepository.findOne({
      where: { taskId, pcId },
    });

    if (!taskPc) {
      throw new NotFoundException('Связь задачи с ПК не найдена');
    }

    taskPc.status = status;
    if (errorMessage) {
      taskPc.errorMessage = errorMessage;
    }
    if (status === TaskPcStatus.COMPLETED || status === TaskPcStatus.FAILED) {
      taskPc.completedAt = new Date();
    }

    await this.taskPcRepository.save(taskPc);

    // Обновляем статус задачи
    await this.updateTaskStatus(taskId);
  }

  private async updateTaskStatus(taskId: number): Promise<void> {
    const taskPcs = await this.taskPcRepository.find({
      where: { taskId },
    });

    const allCompleted = taskPcs.every(
      (tp) =>
        tp.status === TaskPcStatus.COMPLETED ||
        tp.status === TaskPcStatus.FAILED ||
        tp.status === TaskPcStatus.SKIPPED,
    );

    const hasInProgress = taskPcs.some(
      (tp) => tp.status === TaskPcStatus.IN_PROGRESS,
    );

    const task = await this.tasksRepository.findOne({ where: { id: taskId } });
    if (!task) return;

    if (allCompleted) {
      const hasFailed = taskPcs.some(
        (tp) => tp.status === TaskPcStatus.FAILED,
      );
      task.status = hasFailed ? TaskStatus.FAILED : TaskStatus.COMPLETED;
    } else if (hasInProgress) {
      task.status = TaskStatus.IN_PROGRESS;
    }

    await this.tasksRepository.save(task);
  }

  async getPendingTasksForPc(pcId: number): Promise<Task[]> {
    const taskPcs = await this.taskPcRepository.find({
      where: { pcId, status: TaskPcStatus.PENDING },
    });

    if (taskPcs.length === 0) {
      return [];
    }

    const taskIds = taskPcs.map((tp) => tp.taskId);
    return this.tasksRepository.find({
      where: { id: In(taskIds), status: TaskStatus.PENDING },
      relations: ['distribution'],
    });
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    
    // Удаляем связи с ПК
    await this.taskPcRepository.delete({ taskId: id });
    
    await this.tasksRepository.remove(task);
  }
}

