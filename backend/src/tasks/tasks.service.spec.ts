import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, TaskPC, TaskStatus, TaskPcStatus } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { DistributionsService } from '../distributions/distributions.service';
import { PcsService } from '../pcs/pcs.service';

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: jest.Mocked<Repository<Task>>;
  let taskPcRepository: jest.Mocked<Repository<TaskPC>>;
  let distributionsService: jest.Mocked<DistributionsService>;
  let pcsService: jest.Mocked<PcsService>;

  const mockDistribution = {
    id: 1,
    filename: 'setup.exe',
    folderPath: '/path/to/dist',
    version: '8.3.25.1234',
    architecture: 'x64',
    fileSize: 1000000,
    createdAt: new Date(),
  };

  const mockPcs = [
    { id: 1, name: 'PC 1', ipAddress: '192.168.1.1' },
    { id: 2, name: 'PC 2', ipAddress: '192.168.1.2' },
  ];

  const mockTask = {
    id: 1,
    name: 'Test Task',
    description: 'Test description',
    distributionId: 1,
    status: TaskStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    distribution: mockDistribution,
    pcs: mockPcs,
  };

  beforeEach(async () => {
    const mockTasksRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockTaskPcRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockDistributionsService = {
      findOne: jest.fn(),
    };

    const mockPcsService = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTasksRepository,
        },
        {
          provide: getRepositoryToken(TaskPC),
          useValue: mockTaskPcRepository,
        },
        {
          provide: DistributionsService,
          useValue: mockDistributionsService,
        },
        {
          provide: PcsService,
          useValue: mockPcsService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    tasksRepository = module.get(getRepositoryToken(Task));
    taskPcRepository = module.get(getRepositoryToken(TaskPC));
    distributionsService = module.get(DistributionsService);
    pcsService = module.get(PcsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('должен создать задачу с правильными ПК', async () => {
      const createTaskDto: CreateTaskDto = {
        name: 'Test Task',
        description: 'Test',
        distributionId: 1,
        pcIds: [1, 2],
      };

      distributionsService.findOne.mockResolvedValue(mockDistribution as any);
      pcsService.findAll.mockResolvedValue(mockPcs as any);
      tasksRepository.create.mockReturnValue(mockTask as Task);
      tasksRepository.save.mockResolvedValue(mockTask as Task);
      tasksRepository.findOne.mockResolvedValue(mockTask as Task);

      const result = await service.create(createTaskDto);

      expect(distributionsService.findOne).toHaveBeenCalledWith(1);
      expect(pcsService.findAll).toHaveBeenCalled();
      expect(tasksRepository.save).toHaveBeenCalled();
      expect(taskPcRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockTask);
    });

    it('должен выбросить NotFoundException для несуществующего дистрибутива', async () => {
      const createTaskDto: CreateTaskDto = {
        name: 'Test Task',
        distributionId: 999,
        pcIds: [1],
      };

      distributionsService.findOne.mockRejectedValue(new NotFoundException('Дистрибутив не найден'));

      await expect(service.create(createTaskDto)).rejects.toThrow(NotFoundException);
    });

    it('должен выбросить NotFoundException для несуществующих ПК', async () => {
      const createTaskDto: CreateTaskDto = {
        name: 'Test Task',
        distributionId: 1,
        pcIds: [999],
      };

      distributionsService.findOne.mockResolvedValue(mockDistribution as any);
      pcsService.findAll.mockResolvedValue(mockPcs as any);

      await expect(service.create(createTaskDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('должен вернуть все задачи', async () => {
      const tasks = [mockTask];
      tasksRepository.find.mockResolvedValue(tasks as Task[]);

      const result = await service.findAll();

      expect(tasksRepository.find).toHaveBeenCalledWith({
        relations: ['distribution', 'pcs'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(tasks);
    });
  });

  describe('findOne', () => {
    it('должен вернуть задачу по ID', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask as Task);

      const result = await service.findOne(1);

      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['distribution', 'pcs'],
      });
      expect(result).toEqual(mockTask);
    });

    it('должен выбросить NotFoundException для несуществующей задачи', async () => {
      tasksRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTaskPcStatus', () => {
    it('должен обновить статус задачи для ПК', async () => {
      const mockTaskPc = {
        id: 1,
        taskId: 1,
        pcId: 1,
        status: TaskPcStatus.PENDING,
        errorMessage: null,
        completedAt: null,
      };

      taskPcRepository.findOne.mockResolvedValue(mockTaskPc as TaskPC);
      taskPcRepository.save.mockResolvedValue(mockTaskPc as TaskPC);
      taskPcRepository.find.mockResolvedValue([mockTaskPc] as TaskPC[]);
      tasksRepository.findOne.mockResolvedValue(mockTask as Task);
      tasksRepository.save.mockResolvedValue(mockTask as Task);

      await service.updateTaskPcStatus(1, 1, TaskPcStatus.COMPLETED);

      expect(taskPcRepository.findOne).toHaveBeenCalledWith({
        where: { taskId: 1, pcId: 1 },
      });
      expect(taskPcRepository.save).toHaveBeenCalled();
    });
  });

  describe('getPendingTasksForPc', () => {
    it('должен вернуть ожидающие задачи для ПК', async () => {
      const mockTaskPcs = [
        { taskId: 1, pcId: 1, status: TaskPcStatus.PENDING },
      ];
      const tasks = [mockTask];

      taskPcRepository.find.mockResolvedValue(mockTaskPcs as TaskPC[]);
      tasksRepository.find.mockResolvedValue(tasks as Task[]);

      const result = await service.getPendingTasksForPc(1);

      expect(taskPcRepository.find).toHaveBeenCalledWith({
        where: { pcId: 1, status: TaskPcStatus.PENDING },
      });
      expect(result).toEqual(tasks);
    });
  });

  describe('remove', () => {
    it('должен удалить задачу и связанные записи', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask as Task);
      taskPcRepository.delete.mockResolvedValue({ affected: 2 } as any);
      tasksRepository.remove.mockResolvedValue(mockTask as Task);

      await service.remove(1);

      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['distribution', 'pcs'],
      });
      expect(taskPcRepository.delete).toHaveBeenCalledWith({ taskId: 1 });
      expect(tasksRepository.remove).toHaveBeenCalledWith(mockTask);
    });
  });
});

