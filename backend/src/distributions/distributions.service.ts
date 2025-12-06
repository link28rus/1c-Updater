import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Distribution } from './entities/distribution.entity';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const AdmZip = require('adm-zip');
const execAsync = promisify(exec);

@Injectable()
export class DistributionsService {
  constructor(
    @InjectRepository(Distribution)
    private distributionsRepository: Repository<Distribution>,
  ) {}

  async create(
    filename: string,
    filePath: string,
    fileSize: number,
    description?: string,
  ): Promise<Distribution> {
    const { version, architecture, mainFile } = this.parseFilename(filename);

    // Создаем уникальную папку для дистрибутива
    const distributionFolder = path.join(
      path.dirname(filePath),
      `dist-${Date.now()}-${Math.round(Math.random() * 1e9)}`
    );
    fs.mkdirSync(distributionFolder, { recursive: true });

    let extractedFolderPath = distributionFolder;
    let totalSize = fileSize;

    // Если это ZIP архив, распаковываем его
    if (filename.toLowerCase().endsWith('.zip')) {
      try {
        const AdmZipClass = AdmZip.default || AdmZip;
        const zip = new AdmZipClass(filePath);
        zip.extractAllTo(distributionFolder, true);
        
        // Удаляем ZIP файл после распаковки
        fs.unlinkSync(filePath);
        
        // Вычисляем общий размер всех файлов
        totalSize = this.calculateFolderSize(distributionFolder);
        
        // Ищем основной файл (setup.exe или .msi)
        const mainFilePath = this.findMainFile(distributionFolder);
        if (mainFilePath) {
          extractedFolderPath = distributionFolder;
        }
      } catch (error) {
        console.error('Error extracting ZIP:', error);
        // Если ошибка распаковки, удаляем папку и пробрасываем ошибку
        if (fs.existsSync(distributionFolder)) {
          fs.rmSync(distributionFolder, { recursive: true, force: true });
        }
        throw new Error('Ошибка распаковки ZIP архива');
      }
    } else if (filename.toLowerCase().endsWith('.rar')) {
      // Если это RAR архив, распаковываем его
      try {
        await this.extractRar(filePath, distributionFolder);
        
        // Удаляем RAR файл после распаковки
        fs.unlinkSync(filePath);
        
        // Вычисляем общий размер всех файлов
        totalSize = this.calculateFolderSize(distributionFolder);
        
        // Ищем основной файл (setup.exe или .msi)
        const mainFilePath = this.findMainFile(distributionFolder);
        if (mainFilePath) {
          extractedFolderPath = distributionFolder;
        }
      } catch (error) {
        console.error('Error extracting RAR:', error);
        // Если ошибка распаковки, удаляем папку и пробрасываем ошибку
        if (fs.existsSync(distributionFolder)) {
          fs.rmSync(distributionFolder, { recursive: true, force: true });
        }
        throw error;
      }
    } else {
      // Если это один файл, перемещаем его в папку
      const targetPath = path.join(distributionFolder, filename);
      fs.renameSync(filePath, targetPath);
    }

    const distribution = this.distributionsRepository.create({
      filename: mainFile || filename,
      folderPath: extractedFolderPath,
      version,
      architecture,
      fileSize: totalSize,
      description,
    });

    return this.distributionsRepository.save(distribution);
  }

  private calculateFolderSize(folderPath: string): number {
    let totalSize = 0;
    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += this.calculateFolderSize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }

  private findMainFile(folderPath: string): string | null {
    // Ищем setup.exe или .msi файл
    const files = fs.readdirSync(folderPath);
    
    // Приоритет: setup.exe > *.msi > первый .exe
    const setupExe = files.find(f => f.toLowerCase() === 'setup.exe');
    if (setupExe) return setupExe;
    
    const msiFile = files.find(f => f.toLowerCase().endsWith('.msi'));
    if (msiFile) return msiFile;
    
    const exeFile = files.find(f => f.toLowerCase().endsWith('.exe'));
    if (exeFile) return exeFile;
    
    return null;
  }

  async findAll(): Promise<Distribution[]> {
    try {
      return await this.distributionsRepository.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('Error in findAll distributions:', error);
      // Return empty array instead of throwing
      console.error('Returning empty array due to error');
      return [];
    }
  }

  async findOne(id: number): Promise<Distribution> {
    const distribution = await this.distributionsRepository.findOne({
      where: { id },
    });

    if (!distribution) {
      throw new NotFoundException('Дистрибутив не найден');
    }

    return distribution;
  }

  async remove(id: number): Promise<void> {
    const distribution = await this.findOne(id);
    
    // Удаляем всю папку с диска
    if (fs.existsSync(distribution.folderPath)) {
      fs.rmSync(distribution.folderPath, { recursive: true, force: true });
    }

    await this.distributionsRepository.remove(distribution);
  }

  private async extractRar(rarPath: string, extractTo: string): Promise<void> {
    // Пробуем использовать WinRAR или unrar (если установлены)
    const unrarCommands = [
      // WinRAR в стандартных местах
      `"C:\\Program Files\\WinRAR\\WinRAR.exe" x -o+ -ibck "${rarPath}" "${extractTo}\\"`,
      `"C:\\Program Files (x86)\\WinRAR\\WinRAR.exe" x -o+ -ibck "${rarPath}" "${extractTo}\\"`,
      // unrar в PATH
      `unrar x -o+ "${rarPath}" "${extractTo}\\"`,
      // 7-Zip (может распаковывать RAR)
      `"C:\\Program Files\\7-Zip\\7z.exe" x -o"${extractTo}" "${rarPath}"`,
      `"C:\\Program Files (x86)\\7-Zip\\7z.exe" x -o"${extractTo}" "${rarPath}"`,
    ];

    let lastError: Error | null = null;

    for (const command of unrarCommands) {
      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 600000, // 10 минут таймаут для больших архивов
          maxBuffer: 1024 * 1024 * 100, // 100MB буфер
          windowsHide: true, // Скрыть окно консоли
        });
        
        // Проверяем, что файлы были распакованы
        if (fs.existsSync(extractTo)) {
          const files = fs.readdirSync(extractTo);
          if (files.length > 0) {
            console.log(`RAR успешно распакован в ${extractTo}`);
            return; // Успешно распаковано
          }
        }
      } catch (error: any) {
        lastError = error;
        // Пробуем следующую команду
        continue;
      }
    }

    // Если все команды не сработали, пробрасываем ошибку
    throw new Error(
      `Не удалось распаковать RAR архив. Установите WinRAR, 7-Zip или unrar. ` +
      `Последняя ошибка: ${lastError?.message || 'Unknown error'}`
    );
  }

  private parseFilename(filename: string): { version: string; architecture: string; mainFile?: string } {
    // Парсинг версии из имени файла
    // Примеры: 
    // "1c-8.3.25.1234-x64.msi" -> 8.3.25.1234
    // "1cv8-8.3.25.1234-x86.exe" -> 8.3.25.1234
    // "windows64full_8_3_27_1786.rar" -> 8.3.27.1786
    // "windows64full_8.3.27.1786.rar" -> 8.3.27.1786
    
    let version = 'unknown';
    
    // Сначала пробуем найти версию с точками: 8.3.27.1786
    let versionMatch = filename.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (versionMatch) {
      version = versionMatch[1];
    } else {
      // Если не нашли с точками, пробуем найти с подчеркиваниями: 8_3_27_1786
      versionMatch = filename.match(/(\d+_\d+_\d+_\d+)/);
      if (versionMatch) {
        // Преобразуем подчеркивания в точки
        version = versionMatch[1].replace(/_/g, '.');
      } else {
        // Пробуем найти версию с дефисами: 8-3-27-1786
        versionMatch = filename.match(/(\d+-\d+-\d+-\d+)/);
        if (versionMatch) {
          version = versionMatch[1].replace(/-/g, '.');
        } else {
          // Пробуем найти версию из трех чисел: 8.3.27
          versionMatch = filename.match(/(\d+\.\d+\.\d+)/);
          if (versionMatch) {
            version = versionMatch[1];
          } else {
            // Пробуем найти версию из трех чисел с подчеркиваниями: 8_3_27
            versionMatch = filename.match(/(\d+_\d+_\d+)/);
            if (versionMatch) {
              version = versionMatch[1].replace(/_/g, '.');
            }
          }
        }
      }
    }

    // Определение архитектуры
    let architecture = 'x86';
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('x64') || lowerFilename.includes('64') || lowerFilename.includes('64full')) {
      architecture = 'x64';
    } else if (lowerFilename.includes('x86') || lowerFilename.includes('32') || lowerFilename.includes('32full')) {
      architecture = 'x86';
    }

    // Для ZIP и RAR файлов mainFile будет определен после распаковки
    const mainFile = (filename.toLowerCase().endsWith('.zip') || filename.toLowerCase().endsWith('.rar')) 
      ? undefined 
      : filename;

    return { version, architecture, mainFile };
  }
}
