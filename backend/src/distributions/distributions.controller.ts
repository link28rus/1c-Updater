import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { DistributionsService } from './distributions.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('distributions')
export class DistributionsController {
  constructor(private readonly distributionsService: DistributionsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDistributionDto: CreateDistributionDto,
  ) {
    if (!file) {
      throw new Error('Файл не загружен');
    }

    return this.distributionsService.create(
      file.originalname,
      file.path,
      file.size,
      createDistributionDto.description,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.distributionsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.distributionsService.findOne(id);
  }

  @Public()
  @Get(':id/download')
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response): Promise<void> {
    const distribution = await this.distributionsService.findOne(id);
    const folderPath = distribution.folderPath;
    
    if (!fs.existsSync(folderPath)) {
      throw new NotFoundException('Дистрибутив не найден');
    }

    // Создаем ZIP архив из папки
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    
    // Добавляем все файлы из папки в ZIP
    this.addFolderToZip(zip, folderPath, '');
    
    // Отправляем ZIP архив
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${distribution.filename.replace(/\.[^/.]+$/, '')}.zip"`);
    
    const zipBuffer = zip.toBuffer();
    res.send(zipBuffer);
  }

  private addFolderToZip(zip: any, folderPath: string, zipPath: string): void {
    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      const zipFilePath = zipPath ? `${zipPath}/${file}` : file;
      
      if (stats.isDirectory()) {
        this.addFolderToZip(zip, filePath, zipFilePath);
      } else {
        zip.addFile(zipFilePath, fs.readFileSync(filePath));
      }
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.distributionsService.remove(id);
  }
}

