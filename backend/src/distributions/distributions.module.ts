import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistributionsService } from './distributions.service';
import { DistributionsController } from './distributions.controller';
import { Distribution } from './entities/distribution.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as fs from 'fs';

@Module({
  imports: [
    TypeOrmModule.forFeature([Distribution]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uploadDir = configService.get<string>('UPLOAD_DIR') || './uploads/distributions';
        
        // Создаем директорию если не существует
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        return {
          storage: diskStorage({
            destination: uploadDir,
            filename: (req, file, cb) => {
              const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
              const ext = extname(file.originalname);
              cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            },
          }),
          fileFilter: (req, file, cb) => {
            // Разрешаем ZIP, RAR архивы и исполняемые файлы
            if (file.mimetype === 'application/zip' ||
                file.mimetype === 'application/x-zip-compressed' ||
                file.originalname.endsWith('.zip') ||
                file.mimetype === 'application/x-rar-compressed' ||
                file.mimetype === 'application/vnd.rar' ||
                file.originalname.endsWith('.rar') ||
                file.mimetype === 'application/octet-stream' || 
                file.mimetype === 'application/x-msdownload' ||
                file.originalname.endsWith('.msi') ||
                file.originalname.endsWith('.exe')) {
              cb(null, true);
            } else {
              cb(new Error('Разрешены только ZIP, RAR архивы, .msi и .exe файлы'), false);
            }
          },
          limits: {
            fileSize: 2 * 1024 * 1024 * 1024, // 2GB для ZIP архивов
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [DistributionsController],
  providers: [DistributionsService],
  exports: [DistributionsService],
})
export class DistributionsModule {}
