import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('distributions')
export class Distribution {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string; // Имя основного файла (setup.exe или .msi)

  @Column()
  folderPath: string; // Путь к папке со всеми файлами дистрибутива

  @Column()
  version: string; // Извлечено из имени файла

  @Column()
  architecture: string; // 'x86' или 'x64'

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}


