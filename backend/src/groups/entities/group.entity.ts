import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PC } from '../../pcs/entities/pc.entity';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => PC, (pc) => pc.group)
  pcs: PC[];

  @CreateDateColumn()
  createdAt: Date;
}




