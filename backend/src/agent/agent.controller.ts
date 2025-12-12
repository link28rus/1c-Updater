import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Res,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import { AgentService } from './agent.service';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { TaskPcStatus } from '../tasks/entities/task.entity';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Public()
  @Post('register')
  async register(@Body() registerAgentDto: RegisterAgentDto) {
    console.log(`[AgentController] POST /api/agent/register`, registerAgentDto);
    try {
      const result = await this.agentService.register(registerAgentDto);
      console.log(`[AgentController] Регистрация успешна:`, result);
      return result;
    } catch (error) {
      console.error(`[AgentController] Ошибка регистрации:`, error);
      throw error;
    }
  }

  @Public()
  @Post('heartbeat/:agentId')
  async heartbeat(@Param('agentId') agentId: string) {
    console.log(`[AgentController] POST /api/agent/heartbeat/${agentId}`);
    try {
      await this.agentService.heartbeat(agentId);
      return { success: true };
    } catch (error) {
      console.error(`[AgentController] Ошибка heartbeat:`, error);
      throw error;
    }
  }

  @Public()
  @Post('status/:agentId')
  async updateStatus(
    @Param('agentId') agentId: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    console.log(`[AgentController] POST /api/agent/status/${agentId}`);
    console.log(`[AgentController] UpdateStatusDto:`, JSON.stringify(updateStatusDto, null, 2));
    try {
      await this.agentService.updateStatus(agentId, updateStatusDto);
      console.log(`[AgentController] Статус успешно обновлен для агента: ${agentId}`);
      return { success: true };
    } catch (error) {
      console.error(`[AgentController] Ошибка обновления статуса:`, error);
      throw error;
    }
  }

  @Public()
  @Get('tasks/:agentId')
  async getPendingTasks(@Param('agentId') agentId: string) {
    return this.agentService.getPendingTasks(agentId);
  }

  @Public()
  @Post('tasks/:agentId/:taskId/progress')
  async reportTaskProgress(
    @Param('agentId') agentId: string,
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() body: { status: TaskPcStatus; errorMessage?: string },
  ) {
    await this.agentService.reportTaskProgress(
      agentId,
      taskId,
      body.status,
      body.errorMessage,
    );
    return { success: true };
  }

  @Get('install-script/:pcId')
  @UseGuards(JwtAuthGuard)
  async getInstallScript(
    @Res() res: Response,
    @Param('pcId', ParseIntPipe) pcId: number,
    @Query('serverUrl') serverUrl?: string,
  ) {
    const script = await this.agentService.generateInstallScript(pcId, serverUrl);
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="install-agent-pc${pcId}.ps1"`);
    res.send(script);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getAgentsStatus() {
    console.log(`[AgentController] GET /api/agent/status`);
    try {
      const result = await this.agentService.getAllAgentsStatus();
      console.log(`[AgentController] Статус агентов возвращен: ${result.length} записей`);
      return result;
    } catch (error) {
      console.error(`[AgentController] Ошибка получения статуса:`, error);
      throw error;
    }
  }

  @Public()
  @Get('download-exe')
  async downloadAgentExe(@Res() res: Response) {
    const exePath = await this.agentService.getAgentExePath();
    
    if (!exePath) {
      throw new NotFoundException('Файл агента не найден. Убедитесь, что проект собран.');
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="1CUpdaterAgent.exe"');
    res.sendFile(exePath);
  }

  @Get('download-installer')
  @UseGuards(JwtAuthGuard)
  async downloadInstaller(@Res() res: Response) {
    try {
      console.log(`[AgentController] Начало скачивания установщика...`);
      const installerPath = await this.agentService.getInstallerPath();
      
      if (!installerPath) {
        console.error(`[AgentController] ❌ Путь к установщику не найден`);
        throw new NotFoundException('Файл установщика не найден. Убедитесь, что проект собран.');
      }

      // Извлекаем имя файла из полного пути
      const fileName = path.basename(installerPath);
      console.log(`[AgentController] Полный путь установщика: ${installerPath}`);
      console.log(`[AgentController] Имя файла из basename: ${fileName}`);
      
      // Проверяем, что файл содержит версию
      if (!fileName.includes('-v')) {
        console.error(`[AgentController] ❌ КРИТИЧЕСКАЯ ОШИБКА: Файл не содержит версию в имени!`);
        console.error(`[AgentController] Имя файла: ${fileName}`);
        throw new Error('Установщик должен иметь версию в имени файла (формат: 1CUpdaterAgentInstaller-vX.Y.Z.exe)');
      }
      
      // Всегда используем имя файла из пути (оно уже содержит версию)
      const downloadFileName = fileName;
      
      console.log(`[AgentController] ✅ Имя файла для скачивания: ${downloadFileName}`);
      console.log(`[AgentController] Файл содержит версию: ${fileName.includes('-v')}`);

      res.setHeader('Content-Type', 'application/octet-stream');
      // Используем RFC 5987 для корректной передачи имени файла с версией
      const encodedFileName = encodeURIComponent(downloadFileName);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"; filename*=UTF-8''${encodedFileName}`);
      console.log(`[AgentController] ✅ Content-Disposition установлен: filename="${downloadFileName}"; filename*=UTF-8''${encodedFileName}`);
      
      res.sendFile(installerPath);
    } catch (error) {
      console.error(`[AgentController] ❌ Ошибка при скачивании установщика: ${error}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Ошибка при получении установщика: ${error.message}`);
    }
  }

  @Delete(':agentId')
  @UseGuards(JwtAuthGuard)
  async deleteAgent(@Param('agentId') agentId: string) {
    console.log(`[AgentController] DELETE /api/agent/${agentId}`);
    try {
      await this.agentService.deleteAgent(agentId);
      return { success: true };
    } catch (error) {
      console.error(`[AgentController] Ошибка удаления агента:`, error);
      throw error;
    }
  }
}

