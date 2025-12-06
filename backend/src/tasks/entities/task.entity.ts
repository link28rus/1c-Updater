import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Distribution } from '../../distributions/entities/distribution.entity';
import { PC } from '../../pcs/entities/pc.entity';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPcStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Distribution)
  @JoinColumn({ name: 'distributionId' })
  distribution: Distribution;

  @Column()
  distributionId: number;

  @ManyToMany(() => PC)
  @JoinTable({
    name: 'task_pc',
    joinColumn: { name: 'taskId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'pcId', referencedColumnName: 'id' },
  })
  pcs: PC[];

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('task_pc')
export class TaskPC {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  taskId: number;

  @Column()
  pcId: number;

  @ManyToOne(() => PC, { eager: true })
  @JoinColumn({ name: 'pcId' })
  pc: PC;

  @Column({
    type: 'enum',
    enum: TaskPcStatus,
    default: TaskPcStatus.PENDING,
  })
  status: TaskPcStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  completedAt: Date;
}

