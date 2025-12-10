import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PcsService } from './pcs.service';
import { PC } from './entities/pc.entity';
import { CreatePcDto } from './dto/create-pc.dto';
import { UpdatePcDto } from './dto/update-pc.dto';

describe('PcsService', () => {
  let service: PcsService;
  let repository: jest.Mocked<Repository<PC>>;
  let configService: jest.Mocked<ConfigService>;

  const mockPc = {
    id: 1,
    name: 'Test PC',
    ipAddress: '192.168.1.100',
    description: 'Test description',
    adminUsername: 'admin',
    adminPassword: 'encryptedPassword',
    lastOneCVersion: '8.3.25.1234',
    oneCArchitecture: 'x64',
    isOnline: false,
    lastHeartbeat: null,
    groupId: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PcsService,
        {
          provide: getRepositoryToken(PC),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PcsService>(PcsService);
    repository = module.get(getRepositoryToken(PC));
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('должен создать новый ПК с зашифрованным паролем', async () => {
      const createPcDto: CreatePcDto = {
        name: 'Test PC',
        ipAddress: '192.168.1.100',
        adminUsername: 'admin',
        adminPassword: 'plainPassword',
        description: 'Test',
      };

      const createdPc = { ...mockPc, adminPassword: 'encryptedPassword' };
      repository.create.mockReturnValue(createdPc as PC);
      repository.save.mockResolvedValue(createdPc as PC);

      const result = await service.create(createPcDto);

      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(result).toEqual(createdPc);
    });
  });

  describe('findAll', () => {
    it('должен вернуть список ПК без паролей', async () => {
      const pcs = [mockPc];
      repository.find.mockResolvedValue(pcs as PC[]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ relations: ['group'] });
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('adminPassword');
    });
  });

  describe('findOne', () => {
    it('должен вернуть ПК по ID без пароля', async () => {
      repository.findOne.mockResolvedValue(mockPc as PC);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['group'],
      });
      expect(result).not.toHaveProperty('adminPassword');
      expect(result.id).toBe(1);
    });

    it('должен выбросить NotFoundException для несуществующего ПК', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('должен обновить ПК', async () => {
      const updatePcDto: UpdatePcDto = {
        name: 'Updated PC',
      };

      repository.findOne.mockResolvedValue(mockPc as PC);
      repository.save.mockResolvedValue({ ...mockPc, ...updatePcDto } as PC);

      const result = await service.update(1, updatePcDto);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated PC');
    });

    it('должен зашифровать новый пароль при обновлении', async () => {
      const updatePcDto: UpdatePcDto = {
        adminPassword: 'newPassword',
      };

      repository.findOne.mockResolvedValue(mockPc as PC);
      repository.save.mockResolvedValue(mockPc as PC);

      await service.update(1, updatePcDto);

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('должен обновить статус ПК', async () => {
      repository.findOne.mockResolvedValue(mockPc as PC);
      repository.save.mockResolvedValue({ ...mockPc, isOnline: true } as PC);

      await service.updateStatus(1, true, '8.3.26.1234', 'x64');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('должен удалить ПК', async () => {
      repository.findOne.mockResolvedValue(mockPc as PC);
      repository.remove.mockResolvedValue(mockPc as PC);

      await service.remove(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['group'],
      });
      expect(repository.remove).toHaveBeenCalledWith(mockPc);
    });
  });
});

