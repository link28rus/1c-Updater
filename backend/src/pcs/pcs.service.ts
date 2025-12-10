import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PC } from './entities/pc.entity';
import { CreatePcDto } from './dto/create-pc.dto';
import { UpdatePcDto } from './dto/update-pc.dto';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '../common/gateways/events.gateway';

@Injectable()
export class PcsService {
  private readonly encryptionSecret: string;

  constructor(
    @InjectRepository(PC)
    private pcsRepository: Repository<PC>,
    private configService: ConfigService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
  ) {
    this.encryptionSecret = this.configService.get<string>('ENCRYPTION_SECRET') || 'default-secret';
  }

  async create(createPcDto: CreatePcDto): Promise<PC> {
    const encryptedPassword = PC.encryptPassword(
      createPcDto.adminPassword,
      this.encryptionSecret,
    );

    const pc = this.pcsRepository.create({
      ...createPcDto,
      adminPassword: encryptedPassword,
      groupId: createPcDto.groupId || null,
    });

    return this.pcsRepository.save(pc);
  }

  async findAll(): Promise<PC[]> {
    const pcs = await this.pcsRepository.find({
      relations: ['group'],
    });

    // Не возвращаем пароли
    return pcs.map((pc) => {
      const { adminPassword, ...rest } = pc;
      return rest as PC;
    });
  }

  async findOne(id: number): Promise<PC> {
    const pc = await this.pcsRepository.findOne({
      where: { id },
      relations: ['group'],
    });

    if (!pc) {
      throw new NotFoundException('ПК не найден');
    }

    const { adminPassword, ...rest } = pc;
    return rest as PC;
  }

  async update(id: number, updatePcDto: UpdatePcDto): Promise<PC> {
    const pc = await this.pcsRepository.findOne({ where: { id } });

    if (!pc) {
      throw new NotFoundException('ПК не найден');
    }

    if (updatePcDto.adminPassword) {
      updatePcDto.adminPassword = PC.encryptPassword(
        updatePcDto.adminPassword,
        this.encryptionSecret,
      );
    }

    // Обрабатываем groupId: undefined -> null для удаления связи
    const updateData = {
      ...updatePcDto,
      groupId: updatePcDto.groupId !== undefined ? updatePcDto.groupId : null,
    };

    Object.assign(pc, updateData);
    const updated = await this.pcsRepository.save(pc);

    const { adminPassword, ...rest } = updated;
    return rest as PC;
  }

  async remove(id: number): Promise<void> {
    const pc = await this.findOne(id);
    await this.pcsRepository.remove(pc);
  }

  async updateStatus(pcId: number, isOnline: boolean, lastOneCVersion?: string, oneCArchitecture?: string): Promise<void> {
    const pc = await this.pcsRepository.findOne({ where: { id: pcId } });
    if (pc) {
      pc.isOnline = isOnline;
      pc.lastHeartbeat = new Date();
      
      // Обновляем версию 1С: если передано значение (даже пустая строка), обновляем
      // Если передано undefined, не трогаем существующее значение
      if (lastOneCVersion !== undefined) {
        pc.lastOneCVersion = lastOneCVersion || null; // Пустая строка -> null
      }
      if (oneCArchitecture !== undefined) {
        pc.oneCArchitecture = oneCArchitecture || null; // Пустая строка -> null
      }
      
      await this.pcsRepository.save(pc);
      console.log(`[PcsService] Статус ПК обновлен: PcId=${pcId}, isOnline=${isOnline}, version=${pc.lastOneCVersion || 'null'}, arch=${pc.oneCArchitecture || 'null'}`);
      
      // Отправляем событие об изменении статуса ПК
      if (this.eventsGateway) {
        this.eventsGateway.pcStatusChanged(pcId, isOnline);
      }
    }
  }

  async getDecryptedPassword(pcId: number): Promise<string> {
    const pc = await this.pcsRepository.findOne({ where: { id: pcId } });
    if (!pc) {
      throw new NotFoundException('ПК не найден');
    }
    return PC.decryptPassword(pc.adminPassword, this.encryptionSecret);
  }
}


