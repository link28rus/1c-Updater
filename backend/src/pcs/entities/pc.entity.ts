import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { EncryptionUtil } from '../../common/utils/encryption.util';

@Entity('pcs')
export class PC {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'text' })
  adminUsername: string;

  @Column({ type: 'text' })
  adminPassword: string; // Зашифровано

  @Column({ nullable: true })
  lastOneCVersion: string;

  @Column({ nullable: true })
  oneCArchitecture: string; // 'x86' или 'x64'

  @Column({ default: false })
  isOnline: boolean;

  @Column({ nullable: true })
  lastHeartbeat: Date;

  @ManyToOne(() => Group, (group) => group.pcs, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ nullable: true })
  groupId: number;

  @CreateDateColumn()
  createdAt: Date;

  static encryptPassword(password: string, secret: string = 'default-secret'): string {
    return EncryptionUtil.encrypt(password, secret);
  }

  static decryptPassword(encryptedPassword: string, secret: string = 'default-secret'): string {
    return EncryptionUtil.decrypt(encryptedPassword, secret);
  }
}

