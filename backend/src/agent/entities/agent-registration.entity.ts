import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PC } from '../../pcs/entities/pc.entity';

@Entity('agent_registrations')
export class AgentRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  pcId: number;

  @ManyToOne(() => PC)
  @JoinColumn({ name: 'pcId' })
  pc: PC;

  @Column()
  agentId: string; // Уникальный идентификатор агента

  @Column()
  hostname: string;

  @Column()
  osVersion: string;

  @Column({ nullable: true })
  lastOneCVersion: string;

  @Column({ nullable: true })
  oneCArchitecture: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastHeartbeat: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}




