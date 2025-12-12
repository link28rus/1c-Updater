import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentRegistration } from './entities/agent-registration.entity';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { PcsService } from '../pcs/pcs.service';
import { TasksService } from '../tasks/tasks.service';
import { TaskPcStatus } from '../tasks/entities/task.entity';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from '../common/gateways/events.gateway';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(AgentRegistration)
    private agentRepository: Repository<AgentRegistration>,
    private pcsService: PcsService,
    private tasksService: TasksService,
    private configService: ConfigService,
    @Inject(forwardRef(() => EventsGateway))
    private eventsGateway: EventsGateway,
  ) {}

  async register(registerAgentDto: RegisterAgentDto): Promise<AgentRegistration> {
    console.log(`[AgentService] Регистрация агента:`, {
      pcId: registerAgentDto.pcId,
      agentId: registerAgentDto.agentId,
      hostname: registerAgentDto.hostname,
      lastOneCVersion: registerAgentDto.lastOneCVersion || 'null',
      oneCArchitecture: registerAgentDto.oneCArchitecture || 'null',
    });

    // Проверяем существование ПК
    const pc = await this.pcsService.findOne(registerAgentDto.pcId);
    console.log(`[AgentService] ПК найден:`, pc ? { id: pc.id, name: pc.name } : 'НЕ НАЙДЕН');

    let agent = await this.agentRepository.findOne({
      where: { pcId: registerAgentDto.pcId },
    });
    console.log(`[AgentService] Существующий агент:`, agent ? { id: agent.id, agentId: agent.agentId, lastOneCVersion: agent.lastOneCVersion || 'null' } : 'НЕ НАЙДЕН');

    if (agent) {
      // Обновляем существующую регистрацию
      agent.agentId = registerAgentDto.agentId;
      agent.hostname = registerAgentDto.hostname;
      agent.osVersion = registerAgentDto.osVersion;
      agent.lastOneCVersion = registerAgentDto.lastOneCVersion || null;
      agent.oneCArchitecture = registerAgentDto.oneCArchitecture || null;
      agent.isActive = true;
      agent.lastHeartbeat = new Date();
    } else {
      // Создаем новую регистрацию
      agent = this.agentRepository.create({
        pcId: registerAgentDto.pcId,
        agentId: registerAgentDto.agentId,
        hostname: registerAgentDto.hostname,
        osVersion: registerAgentDto.osVersion,
        lastOneCVersion: registerAgentDto.lastOneCVersion || null,
        oneCArchitecture: registerAgentDto.oneCArchitecture || null,
        isActive: true,
        lastHeartbeat: new Date(),
      });
    }

    const savedAgent = await this.agentRepository.save(agent);
    console.log(`[AgentService] Агент сохранен:`, {
      id: savedAgent.id,
      pcId: savedAgent.pcId,
      agentId: savedAgent.agentId,
      lastOneCVersion: savedAgent.lastOneCVersion || 'null',
      oneCArchitecture: savedAgent.oneCArchitecture || 'null',
    });

    // Обновляем статус ПК с версией 1С
    await this.pcsService.updateStatus(
      registerAgentDto.pcId,
      true,
      savedAgent.lastOneCVersion || null,
      savedAgent.oneCArchitecture || null,
    );
    console.log(`[AgentService] Статус ПК обновлен: PcId=${registerAgentDto.pcId}, Version=${savedAgent.lastOneCVersion || 'null'}, Arch=${savedAgent.oneCArchitecture || 'null'}`);

    // Отправляем событие о регистрации агента
    if (this.eventsGateway) {
      this.eventsGateway.agentRegistered(savedAgent);
    }

    return savedAgent;
  }

  async heartbeat(agentId: string): Promise<void> {
    console.log(`[AgentService] Heartbeat от агента: ${agentId}`);
    const agent = await this.agentRepository.findOne({
      where: { agentId },
    });

    if (agent) {
      agent.lastHeartbeat = new Date();
      agent.isActive = true; // Помечаем агента как активного
      await this.agentRepository.save(agent);
      console.log(`[AgentService] Heartbeat обновлен для агента: ${agentId}, PcId: ${agent.pcId}`);

      // Обновляем статус ПК
      await this.pcsService.updateStatus(agent.pcId, true);
    } else {
      console.warn(`[AgentService] Агент с agentId=${agentId} не найден в базе данных`);
    }
  }

  async updateStatus(agentId: string, updateStatusDto: UpdateStatusDto): Promise<void> {
    console.log(`[AgentService] UpdateStatus вызван: agentId=${agentId}`, {
      lastOneCVersion: updateStatusDto.lastOneCVersion,
      oneCArchitecture: updateStatusDto.oneCArchitecture,
      updateStatusDto: JSON.stringify(updateStatusDto),
    });
    
    const agent = await this.agentRepository.findOne({
      where: { agentId },
    });

    if (!agent) {
      console.error(`[AgentService] Агент с agentId=${agentId} не найден в БД`);
      throw new NotFoundException('Агент не найден');
    }

    console.log(`[AgentService] Агент найден: PcId=${agent.pcId}, текущая версия 1С: ${agent.lastOneCVersion || 'null'}, архитектура: ${agent.oneCArchitecture || 'null'}`);

    // Обновляем версию 1С: если передано null, undefined или пустая строка, очищаем
    // Но сохраняем значение, если оно передано (даже если это пустая строка, это означает, что 1С не найдена)
    if (updateStatusDto.lastOneCVersion !== undefined) {
      agent.lastOneCVersion = updateStatusDto.lastOneCVersion || null;
    }
    if (updateStatusDto.oneCArchitecture !== undefined) {
      agent.oneCArchitecture = updateStatusDto.oneCArchitecture || null;
    }
    agent.lastHeartbeat = new Date();

    const savedAgent = await this.agentRepository.save(agent);
    console.log(`[AgentService] Статус агента обновлен и сохранен:`, {
      agentId,
      pcId: savedAgent.pcId,
      lastOneCVersion: savedAgent.lastOneCVersion || 'null',
      oneCArchitecture: savedAgent.oneCArchitecture || 'null',
      lastHeartbeat: savedAgent.lastHeartbeat,
    });

    // Обновляем статус ПК с версией 1С
    await this.pcsService.updateStatus(
      agent.pcId,
      true,
      savedAgent.lastOneCVersion || null,
      savedAgent.oneCArchitecture || null,
    );
    console.log(`[AgentService] Статус ПК обновлен: PcId=${agent.pcId}, Version=${savedAgent.lastOneCVersion || 'null'}, Arch=${savedAgent.oneCArchitecture || 'null'}`);
  }

  async getPendingTasks(agentId: string) {
    console.log(`[AgentService] getPendingTasks вызван для agentId: ${agentId}`);
    
    const agent = await this.agentRepository.findOne({
      where: { agentId },
    });

    if (!agent) {
      // Проверяем, есть ли вообще агенты в БД
      const allAgents = await this.agentRepository.find();
      console.log(`[AgentService] Агент с agentId=${agentId} не найден. Всего агентов в БД: ${allAgents.length}`);
      if (allAgents.length > 0) {
        console.log(`[AgentService] Существующие agentId:`, allAgents.map(a => a.agentId));
      }
      
      // Возвращаем пустой список задач вместо ошибки, чтобы агент мог продолжить работу
      // и зарегистрироваться при следующем heartbeat
      console.log(`[AgentService] Возвращаем пустой список задач для незарегистрированного агента`);
      return [];
    }
    
    console.log(`[AgentService] Агент найден: PcId=${agent.pcId}, AgentId=${agent.agentId}, isActive=${agent.isActive}`);

    return this.tasksService.getPendingTasksForPc(agent.pcId);
  }

  async reportTaskProgress(
    agentId: string,
    taskId: number,
    status: TaskPcStatus,
    errorMessage?: string,
  ): Promise<void> {
    console.log(`[AgentService] reportTaskProgress: agentId=${agentId}, taskId=${taskId}, status=${status}`);
    
    const agent = await this.agentRepository.findOne({
      where: { agentId },
    });

    if (!agent) {
      console.warn(`[AgentService] Агент с agentId=${agentId} не найден при попытке обновить статус задачи ${taskId}`);
      // Не выбрасываем ошибку, чтобы агент мог продолжить работу
      // Агент зарегистрируется при следующем heartbeat
      return;
    }
    
    console.log(`[AgentService] Агент найден: PcId=${agent.pcId}, обновление статуса задачи ${taskId}`);

    await this.tasksService.updateTaskPcStatus(
      taskId,
      agent.pcId,
      status,
      errorMessage,
    );
  }

  async generateInstallScript(pcId: number, serverUrl?: string): Promise<string> {
    const pc = await this.pcsService.findOne(pcId);
    
    // Определяем URL сервера
    let defaultServerUrl = this.configService.get<string>('SERVER_URL');
    if (!defaultServerUrl) {
      const host = this.configService.get<string>('HOST') || 'localhost';
      const port = this.configService.get<string>('PORT') || '3001';
      defaultServerUrl = `http://${host}:${port}`;
    }
    const finalServerUrl = serverUrl || defaultServerUrl;

    const script = `# Скрипт установки 1C Updater Agent для ПК: ${pc.name} (ID: ${pcId})
# Сгенерировано автоматически
# Требует запуска от имени администратора

param(
    [string]$ServiceName = "1CUpdaterAgent",
    [string]$DisplayName = "1C Updater Agent",
    [string]$Description = "Сервис для автоматической установки обновлений 1С на удаленных ПК"
)

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ОШИБКА: Скрипт должен быть запущен от имени администратора!" -ForegroundColor Red
    exit 1
}

# Определение пути к скрипту (должно быть в начале)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptName = [System.IO.Path]::GetFileNameWithoutExtension($MyInvocation.MyCommand.Path)

# Логирование начала установки (лог рядом со скриптом)
$logFile = Join-Path $scriptPath "$scriptName-Install-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    try {
        Add-Content -Path $logFile -Value $logMessage -ErrorAction Stop
    } catch {
        # Если не удалось записать в лог, выводим только в консоль
        Write-Host "ОШИБКА записи в лог: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host $Message
}

Write-Log "=== Начало установки 1C Updater Agent ===" "INFO"
Write-Log "Путь к скрипту: $scriptPath" "INFO"
Write-Log "Имя скрипта: $scriptName" "INFO"
Write-Log "Лог файл: $logFile" "INFO"

# Определение пути к exe файлу
# Сначала проверяем в той же папке, где находится скрипт
Write-Log "Поиск exe файла..." "INFO"

$ExePath = Join-Path $scriptPath "1CUpdaterAgent.exe"
Write-Log "Проверка 1: $ExePath" "INFO"

# Если не найден, проверяем стандартные пути сборки
if (-not (Test-Path $ExePath)) {
    $ExePath = Join-Path $scriptPath "bin\\Release\\net8.0\\1CUpdaterAgent.exe"
    Write-Log "Проверка 2: $ExePath" "INFO"
}

if (-not (Test-Path $ExePath)) {
    $ExePath = Join-Path $scriptPath "bin\\Debug\\net8.0\\1CUpdaterAgent.exe"
    Write-Log "Проверка 3: $ExePath" "INFO"
}

# Если все еще не найден, проверяем текущую директорию
if (-not (Test-Path $ExePath)) {
    $currentDir = Get-Location
    $ExePath = Join-Path $currentDir "1CUpdaterAgent.exe"
    Write-Log "Проверка 4: $ExePath" "INFO"
}

if (-not (Test-Path $ExePath)) {
    Write-Log "ОШИБКА: Файл 1CUpdaterAgent.exe не найден!" "ERROR"
    Write-Log "Искали в следующих местах:" "ERROR"
    Write-Log "  1. $scriptPath\\1CUpdaterAgent.exe" "ERROR"
    Write-Log "  2. $scriptPath\\bin\\Release\\net8.0\\1CUpdaterAgent.exe" "ERROR"
    Write-Log "  3. $scriptPath\\bin\\Debug\\net8.0\\1CUpdaterAgent.exe" "ERROR"
    Write-Log "  4. $currentDir\\1CUpdaterAgent.exe" "ERROR"
    Write-Log "" "ERROR"
    Write-Log "РЕШЕНИЕ:" "ERROR"
    Write-Log "  1. Скопируйте файл 1CUpdaterAgent.exe в ту же папку, где находится скрипт" "ERROR"
    Write-Log "  2. Или укажите полный путь к exe файлу при запуске скрипта" "ERROR"
    Write-Log "  3. Или поместите exe файл в текущую директорию" "ERROR"
    Write-Log "Лог сохранен в: $logFile" "ERROR"
    exit 1
}

Write-Log "Файл найден: $ExePath" "INFO"
$fileInfo = Get-Item $ExePath
Write-Log "Размер файла: $([math]::Round($fileInfo.Length/1KB, 2)) KB" "INFO"
Write-Log "Дата изменения: $($fileInfo.LastWriteTime)" "INFO"

Write-Log "Имя сервиса: $ServiceName" "INFO"
Write-Log "Путь к exe: $ExePath" "INFO"
Write-Log "URL сервера: ${finalServerUrl}" "INFO"
Write-Log "ID ПК: ${pcId}" "INFO"

# Остановка и удаление существующего сервиса
Write-Log "Проверка существующего сервиса..." "INFO"
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Log "Найден существующий сервис. Статус: $($existingService.Status)" "INFO"
    if ($existingService.Status -eq 'Running') {
        Write-Log "Остановка сервиса..." "INFO"
        try {
            Stop-Service -Name $ServiceName -Force -ErrorAction Stop
            Start-Sleep -Seconds 2
            Write-Log "Сервис остановлен" "INFO"
        } catch {
            Write-Log "Ошибка остановки сервиса: $($_.Exception.Message)" "ERROR"
        }
    }
    Write-Log "Удаление сервиса..." "INFO"
    $deleteResult = sc.exe delete $ServiceName 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Сервис удален" "INFO"
    } else {
        Write-Log "Предупреждение при удалении сервиса: $deleteResult" "WARN"
    }
    Start-Sleep -Seconds 2
} else {
    Write-Log "Существующий сервис не найден" "INFO"
}

# Создание сервиса
Write-Log "Создание сервиса..." "INFO"
# Экранируем путь к exe для sc.exe (нужно двойное экранирование кавычек)
$escapedPath = $ExePath -replace '"', '""'
$binPath = "\`"$escapedPath\`""
Write-Log "Команда создания: sc.exe create $ServiceName binPath= $binPath DisplayName= $DisplayName start= auto" "INFO"
$result = sc.exe create $ServiceName binPath= $binPath DisplayName= "$DisplayName" start= auto 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Log "ОШИБКА: Не удалось создать сервис" "ERROR"
    Write-Log "Код ошибки: $LASTEXITCODE" "ERROR"
    Write-Log "Вывод: $result" "ERROR"
    Write-Log "Проверьте:" "ERROR"
    Write-Log "  - Существует ли файл: $ExePath" "ERROR"
    Write-Log "  - Есть ли права администратора" "ERROR"
    Write-Log "  - Не заблокирован ли файл антивирусом" "ERROR"
    Write-Log "Лог сохранен в: $logFile" "ERROR"
    exit 1
}
Write-Log "Сервис создан успешно" "INFO"

# Установка описания
Write-Log "Установка описания сервиса..." "INFO"
$descResult = sc.exe description $ServiceName "$Description" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Log "Описание установлено" "INFO"
} else {
    Write-Log "Предупреждение при установке описания: $descResult" "WARN"
}

# Создание конфигурационного файла
Write-Log "Создание конфигурационного файла..." "INFO"
$configDir = "$env:ProgramData\\1CUpdaterAgent"
Write-Log "Директория конфигурации: $configDir" "INFO"
if (-not (Test-Path $configDir)) {
    try {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        Write-Log "Директория создана" "INFO"
    } catch {
        Write-Log "Ошибка создания директории: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

$configPath = Join-Path $configDir "config.json"
$agentId = [guid]::NewGuid().ToString()
$config = @{
    ServerUrl = "${finalServerUrl}"
    PcId = ${pcId}
    AgentId = $agentId
    PollIntervalSeconds = 30
    HeartbeatIntervalSeconds = 60
} | ConvertTo-Json -Depth 10

try {
    Set-Content -Path $configPath -Value $config -Encoding UTF8
    Write-Log "Конфигурация сохранена: $configPath" "INFO"
    Write-Log "AgentId: $agentId" "INFO"
} catch {
    Write-Log "Ошибка сохранения конфигурации: $($_.Exception.Message)" "ERROR"
    exit 1
}

# Запуск сервиса
Write-Log "Запуск сервиса..." "INFO"
try {
    Start-Service -Name $ServiceName -ErrorAction Stop
    Write-Log "Команда запуска сервиса выполнена" "INFO"
    Start-Sleep -Seconds 3
    
    $service = Get-Service -Name $ServiceName
    if ($service.Status -eq 'Running') {
        Write-Log "✅ Сервис успешно установлен и запущен!" "INFO"
        Write-Log "Статус: $($service.Status)" "INFO"
        Write-Log "Имя: $($service.DisplayName)" "INFO"
        Write-Log "Путь: $ExePath" "INFO"
        Write-Host "\`n✅ Сервис успешно установлен и запущен!" -ForegroundColor Green
        Write-Host "Статус: $($service.Status)" -ForegroundColor White
        Write-Host "Имя: $($service.DisplayName)" -ForegroundColor White
        Write-Host "Путь: $ExePath" -ForegroundColor White
    } else {
        Write-Log "⚠️  Сервис создан, но не запущен. Статус: $($service.Status)" "WARN"
        Write-Host "\`n⚠️  Сервис создан, но не запущен. Статус: $($service.Status)" -ForegroundColor Yellow
        Write-Host "Попробуйте запустить вручную: Start-Service -Name $ServiceName" -ForegroundColor Yellow
        Write-Host "Проверьте логи: Get-EventLog -LogName Application -Source $ServiceName -Newest 10" -ForegroundColor Yellow
    }
} catch {
    Write-Log "❌ Ошибка запуска сервиса: $($_.Exception.Message)" "ERROR"
    Write-Log "Детали ошибки: $($_.Exception)" "ERROR"
    Write-Host "\`n❌ Ошибка запуска сервиса: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Проверьте логи: Get-EventLog -LogName Application -Source $ServiceName -Newest 10" -ForegroundColor Yellow
    Write-Host "Попробуйте запустить вручную: Start-Service -Name $ServiceName" -ForegroundColor Yellow
}

Write-Log "=== Установка завершена ===" "INFO"
Write-Host "\`n=== Установка завершена ===" -ForegroundColor Cyan
Write-Host "\`nПолезные команды:" -ForegroundColor Yellow
Write-Host "  Остановить: Stop-Service -Name $ServiceName" -ForegroundColor White
Write-Host "  Запустить: Start-Service -Name $ServiceName" -ForegroundColor White
Write-Host "  Удалить: sc.exe delete $ServiceName" -ForegroundColor White
Write-Host "  Логи сервиса: Get-EventLog -LogName Application -Source $ServiceName -Newest 50" -ForegroundColor White
Write-Host "  Лог установки: $logFile" -ForegroundColor White
Write-Log "Лог установки сохранен в: $logFile" "INFO"
`;

    return script;
  }

  async getAllAgents(): Promise<AgentRegistration[]> {
    return this.agentRepository.find({ 
      relations: ['pc'] 
    });
  }

  async getAllAgentsStatus() {
    try {
      console.log(`[AgentService] Получение статуса всех агентов...`);
      const agents = await this.agentRepository.find({
        relations: [],
      });
      console.log(`[AgentService] Найдено агентов в БД: ${agents.length}`, agents.map(a => ({ pcId: a.pcId, agentId: a.agentId })));

      const pcs = await this.pcsService.findAll();
      console.log(`[AgentService] Найдено ПК: ${pcs.length}`, pcs.map(pc => ({ id: pc.id, name: pc.name })));

      // Время, после которого агент считается офлайн (2 минуты)
      const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000;
      const now = new Date();

      const result = await Promise.all(pcs.map(async (pc) => {
        const agent = agents.find((a) => a.pcId === pc.id);
        
        // Определяем, онлайн ли агент
        let isOnline = false;
        if (agent && agent.lastHeartbeat) {
          const timeSinceLastHeartbeat = now.getTime() - agent.lastHeartbeat.getTime();
          isOnline = timeSinceLastHeartbeat < OFFLINE_THRESHOLD_MS;
          
          // Если агент офлайн, обновляем статус в БД
          if (!isOnline) {
            if (pc.isOnline) {
              console.log(`[AgentService] Агент на ПК ${pc.id} офлайн (последний heartbeat: ${Math.floor(timeSinceLastHeartbeat / 1000)}s назад)`);
              await this.pcsService.updateStatus(pc.id, false);
            }
            // Помечаем агента как неактивного
            if (agent.isActive) {
              agent.isActive = false;
              await this.agentRepository.save(agent);
            }
          } else {
            // Агент онлайн
            if (!pc.isOnline) {
              console.log(`[AgentService] Агент на ПК ${pc.id} онлайн`);
              await this.pcsService.updateStatus(pc.id, true);
            }
            // Помечаем агента как активного
            if (!agent.isActive) {
              agent.isActive = true;
              await this.agentRepository.save(agent);
            }
          }
        } else {
          // Агента нет в БД
          if (pc.isOnline) {
            console.log(`[AgentService] Агент на ПК ${pc.id} не найден в БД, помечаем ПК как офлайн`);
            await this.pcsService.updateStatus(pc.id, false);
          }
        }

        return {
          pcId: pc.id,
          pcName: pc.name,
          pcIpAddress: pc.ipAddress,
          hasAgent: !!agent,
          agentId: agent?.agentId || null,
          hostname: agent?.hostname || null,
          isActive: agent?.isActive || false,
          lastHeartbeat: agent?.lastHeartbeat ? agent.lastHeartbeat.toISOString() : null,
          lastOneCVersion: agent?.lastOneCVersion || null,
          oneCArchitecture: agent?.oneCArchitecture || null,
        };
      }));
      
      console.log(`[AgentService] Результат getAllAgentsStatus:`, result.map(r => ({ pcId: r.pcId, hasAgent: r.hasAgent, agentId: r.agentId })));
      return result;
    } catch (error) {
      console.error('[AgentService] Ошибка в getAllAgentsStatus:', error);
      throw error;
    }
  }

  async getAgentExePath(): Promise<string | null> {
    // Определяем путь к проекту (на уровень выше от backend)
    const projectRoot = path.resolve(__dirname, '../../..');
    const agentPath = path.join(projectRoot, 'agent');
    
    console.log(`[AgentService] Поиск exe агента. projectRoot: ${projectRoot}`);
    
    // Сначала проверяем self-contained версию (предпочтительно) для net8.0-windows
    const selfContainedPath1 = path.join(agentPath, 'bin', 'Release', 'net8.0-windows', 'win-x64', 'publish', '1CUpdaterAgent.exe');
    if (fs.existsSync(selfContainedPath1)) {
      console.log(`[AgentService] Найден агент: ${selfContainedPath1}`);
      return selfContainedPath1;
    }
    
    // Проверяем self-contained версию для net8.0 (старый путь)
    const selfContainedPath2 = path.join(agentPath, 'bin', 'Release', 'net8.0', 'win-x64', 'publish', '1CUpdaterAgent.exe');
    if (fs.existsSync(selfContainedPath2)) {
      console.log(`[AgentService] Найден агент: ${selfContainedPath2}`);
      return selfContainedPath2;
    }
    
    // Проверяем обычную Release версию для net8.0-windows
    const releasePath1 = path.join(agentPath, 'bin', 'Release', 'net8.0-windows', '1CUpdaterAgent.exe');
    if (fs.existsSync(releasePath1)) {
      console.log(`[AgentService] Найден агент: ${releasePath1}`);
      return releasePath1;
    }
    
    // Проверяем обычную Release версию для net8.0 (старый путь)
    const releasePath2 = path.join(agentPath, 'bin', 'Release', 'net8.0', '1CUpdaterAgent.exe');
    if (fs.existsSync(releasePath2)) {
      console.log(`[AgentService] Найден агент: ${releasePath2}`);
      return releasePath2;
    }
    
    // Проверяем Debug версию
    const debugPath = path.join(agentPath, 'bin', 'Debug', 'net8.0-windows', '1CUpdaterAgent.exe');
    if (fs.existsSync(debugPath)) {
      console.log(`[AgentService] Найден агент: ${debugPath}`);
      return debugPath;
    }
    
    console.log(`[AgentService] Агент не найден. Проверенные пути:`);
    console.log(`  - ${selfContainedPath1}`);
    console.log(`  - ${selfContainedPath2}`);
    console.log(`  - ${releasePath1}`);
    console.log(`  - ${releasePath2}`);
    console.log(`  - ${debugPath}`);
    
    return null;
  }

  async getInstallerPath(): Promise<string | null> {
    // Определяем путь к проекту более надежным способом
    // Ищем корень проекта по наличию папки 'installer'
    let currentDir = __dirname;
    let projectRoot: string | null = null;
    
    // Поднимаемся вверх по директориям, пока не найдем папку 'installer'
    for (let i = 0; i < 5; i++) {
      const installerDir = path.join(currentDir, 'installer');
      if (fs.existsSync(installerDir) && fs.statSync(installerDir).isDirectory()) {
        projectRoot = currentDir;
        break;
      }
      currentDir = path.resolve(currentDir, '..');
    }
    
    // Если не нашли через поиск, используем стандартный путь
    if (!projectRoot) {
      // В development: __dirname = backend/src/agent -> ../../.. = корень проекта
      // В production: __dirname = backend/dist/agent -> ../../.. = корень проекта
      projectRoot = path.resolve(__dirname, '../../..');
    }
    
    const installerPath = path.join(projectRoot, 'installer');
    
    console.log(`[AgentService] Поиск установщика. __dirname: ${__dirname}, projectRoot: ${projectRoot}`);
    
    // Сначала проверяем self-contained версию с версией в имени (предпочтительно)
    // Ищем файлы вида 1CUpdaterAgentInstaller-v*.exe
    try {
      const publishDir = path.join(installerPath, 'bin', 'Release', 'net8.0-windows', 'win-x64', 'publish');
      console.log(`[AgentService] Проверка директории: ${publishDir}`);
      if (fs.existsSync(publishDir)) {
        const files = fs.readdirSync(publishDir);
        console.log(`[AgentService] Найдено файлов в директории: ${files.length}`);
        console.log(`[AgentService] Файлы: ${files.join(', ')}`);
        
        const versionedFiles = files
          .filter(f => f.startsWith('1CUpdaterAgentInstaller-v') && f.endsWith('.exe'))
          .sort()
          .reverse(); // Сортируем по убыванию, чтобы взять самую новую версию
        
        console.log(`[AgentService] Версионированные файлы найдены: ${versionedFiles.length}`);
        if (versionedFiles.length > 0) {
          console.log(`[AgentService] Версионированные файлы: ${versionedFiles.join(', ')}`);
          const latestVersionedFile = path.join(publishDir, versionedFiles[0]);
          
          // Дополнительная проверка существования файла
          if (fs.existsSync(latestVersionedFile)) {
            const stats = fs.statSync(latestVersionedFile);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`[AgentService] ✅ Найден установщик с версией: ${latestVersionedFile} (${sizeMB} МБ)`);
            console.log(`[AgentService] Имя файла для скачивания: ${versionedFiles[0]}`);
            return latestVersionedFile;
          } else {
            console.log(`[AgentService] ⚠️ Версионированный файл не существует: ${latestVersionedFile}`);
          }
        } else {
          console.log(`[AgentService] ⚠️ Версионированные файлы не найдены в ${publishDir}`);
          // Дополнительная проверка: ищем все файлы с паттерном вручную
          const allExeFiles = files.filter(f => f.endsWith('.exe') && f.includes('1CUpdaterAgentInstaller'));
          console.log(`[AgentService] Все найденные exe файлы: ${allExeFiles.join(', ')}`);
        }
      } else {
        console.log(`[AgentService] ⚠️ Директория не существует: ${publishDir}`);
      }
    } catch (error) {
      console.warn(`[AgentService] Ошибка поиска версионированного установщика: ${error}`);
    }
    
    // Fallback: проверяем версионированный файл явно (если предыдущая проверка не сработала)
    const publishDir = path.join(installerPath, 'bin', 'Release', 'net8.0-windows', 'win-x64', 'publish');
    if (fs.existsSync(publishDir)) {
      try {
        const allFiles = fs.readdirSync(publishDir);
        console.log(`[AgentService] Повторная проверка. Всего файлов: ${allFiles.length}`);
        console.log(`[AgentService] Все exe файлы: ${allFiles.filter(f => f.endsWith('.exe')).join(', ')}`);
        
        const versionedFiles = allFiles
          .filter(f => f.startsWith('1CUpdaterAgentInstaller-v') && f.endsWith('.exe'))
          .map(f => ({ name: f, path: path.join(publishDir, f) }))
          .filter(f => {
            const exists = fs.existsSync(f.path);
            console.log(`[AgentService] Проверка файла: ${f.name} - существует: ${exists}`);
            return exists;
          })
          .sort((a, b) => {
            // Извлекаем версию из имени файла для правильной сортировки
            const versionA = a.name.match(/v(\d+\.\d+\.\d+)/)?.[1] || '';
            const versionB = b.name.match(/v(\d+\.\d+\.\d+)/)?.[1] || '';
            return versionB.localeCompare(versionA, undefined, { numeric: true, sensitivity: 'base' });
          });
        
        console.log(`[AgentService] Версионированные файлы после повторной проверки: ${versionedFiles.length}`);
        if (versionedFiles.length > 0) {
          const latest = versionedFiles[0];
          const stats = fs.statSync(latest.path);
          const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          console.log(`[AgentService] ✅ Принудительно найден версионированный установщик: ${latest.path} (${sizeMB} МБ)`);
          console.log(`[AgentService] Имя файла: ${latest.name}`);
          return latest.path;
        }
      } catch (error) {
        console.error(`[AgentService] Ошибка при принудительной проверке версионированного файла: ${error}`);
      }
    }
    
    // НЕ возвращаем файлы без версии - это критическая ошибка!
    console.error(`[AgentService] ❌ КРИТИЧЕСКАЯ ОШИБКА: Версионированный установщик не найден!`);
    console.error(`[AgentService] Проверьте, что файл 1CUpdaterAgentInstaller-v*.exe собран и находится в ${publishDir}`);
    
    // ВАЖНО: Не возвращаем файл без версии, это ошибка конфигурации
    console.error(`[AgentService] Проверенные директории:`);
    console.error(`  - ${publishDir} (существует: ${fs.existsSync(publishDir)})`);
    throw new Error('Версионированный установщик не найден. Убедитесь, что проект собран с версией в имени файла.');
  }

  async deleteAgent(agentId: string): Promise<void> {
    console.log(`[AgentService] Удаление агента: ${agentId}`);
    const agent = await this.agentRepository.findOne({
      where: { agentId },
    });

    if (!agent) {
      throw new NotFoundException('Агент не найден');
    }

    const pcId = agent.pcId;
    
    // Удаляем агента из БД
    await this.agentRepository.remove(agent);
    console.log(`[AgentService] Агент удален: ${agentId}, PcId: ${pcId}`);

    // Обновляем статус ПК на офлайн
    await this.pcsService.updateStatus(pcId, false);
    console.log(`[AgentService] Статус ПК ${pcId} обновлен на офлайн`);
  }
}


