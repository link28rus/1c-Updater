# 1C Updater Agent

Windows Service для автоматической установки обновлений 1С на удаленных ПК.

## Требования

- Windows 10/11 или Windows Server 2016+
- .NET 8 Runtime
- Права администратора для установки
- Доступ к серверу управления (backend)

## Быстрая установка

### Вариант 1: Автоматическая установка (рекомендуется)

1. Соберите проект:
```powershell
cd agent
dotnet build -c Release
```

2. Запустите скрипт установки от имени администратора:
```powershell
.\install-service.ps1 -PcId 1 -ServerUrl "http://YOUR_SERVER_IP:3001"
```

Параметры скрипта:
- `-PcId` - ID ПК в системе (должен соответствовать ID в веб-интерфейсе)
- `-ServerUrl` - URL сервера управления (например: `http://192.168.1.100:3001`)
- `-ExePath` - (опционально) Путь к exe файлу, если отличается от стандартного

### Вариант 2: Ручная установка

1. Соберите проект:
```powershell
dotnet build -c Release
```

2. Создайте конфигурационный файл вручную:
```powershell
$configDir = "$env:ProgramData\1CUpdaterAgent"
New-Item -ItemType Directory -Path $configDir -Force
```

Создайте файл `$configDir\config.json`:
```json
{
  "ServerUrl": "http://YOUR_SERVER_IP:3001",
  "PcId": 1,
  "AgentId": "unique-agent-id",
  "PollIntervalSeconds": 30,
  "HeartbeatIntervalSeconds": 60
}
```

3. Установите как Windows Service:
```powershell
$exePath = "C:\path\to\1CUpdaterAgent.exe"
sc create "1CUpdaterAgent" binPath="$exePath" start=auto DisplayName="1C Updater Agent"
sc description "1CUpdaterAgent" "Сервис для автоматической установки обновлений 1С на удаленных ПК"
sc start "1CUpdaterAgent"
```

## Конфигурация

Конфигурационный файл находится в:
`C:\ProgramData\1CUpdaterAgent\config.json`

### Параметры:

- `ServerUrl` - URL сервера управления (по умолчанию: `http://localhost:3001`)
- `PcId` - ID ПК в системе (должен соответствовать ID в веб-интерфейсе)
- `AgentId` - Уникальный идентификатор агента (генерируется автоматически при первой установке)
- `PollIntervalSeconds` - Интервал опроса задач в секундах (по умолчанию: 30)
- `HeartbeatIntervalSeconds` - Интервал отправки heartbeat в секундах (по умолчанию: 60)

**Важно:** После изменения конфигурации необходимо перезапустить сервис:
```powershell
Restart-Service -Name "1CUpdaterAgent"
```

## Как это работает

1. **Регистрация**: При запуске агент регистрируется на сервере, передавая информацию о ПК (hostname, OS, версия 1С)
2. **Heartbeat**: Каждые 60 секунд агент отправляет heartbeat для подтверждения активности
3. **Опрос задач**: Каждые 30 секунд агент запрашивает у сервера список задач для выполнения
4. **Установка**: При получении задачи агент:
   - Скачивает ZIP архив с дистрибутивом
   - Распаковывает его во временную директорию
   - Находит установочный файл (setup.exe или .msi)
   - Запускает установку от имени администратора
   - Отправляет отчет о результате на сервер

## Логи

Логи сервиса можно просмотреть через Event Viewer:
- Откройте Event Viewer (Просмотр событий)
- Перейдите в Windows Logs > Application
- Найдите записи от "1CUpdaterAgent"

Или через PowerShell:
```powershell
Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 50
```

## Управление сервисом

### Просмотр статуса:
```powershell
Get-Service -Name "1CUpdaterAgent"
```

### Остановка:
```powershell
Stop-Service -Name "1CUpdaterAgent"
```

### Запуск:
```powershell
Start-Service -Name "1CUpdaterAgent"
```

### Перезапуск:
```powershell
Restart-Service -Name "1CUpdaterAgent"
```

### Удаление:
```powershell
Stop-Service -Name "1CUpdaterAgent"
sc delete "1CUpdaterAgent"
```

## Устранение неполадок

### Агент не регистрируется на сервере
- Проверьте доступность сервера: `Test-NetConnection -ComputerName YOUR_SERVER_IP -Port 3001`
- Проверьте правильность `ServerUrl` в конфигурации
- Проверьте, что `PcId` соответствует ID ПК в веб-интерфейсе

### Задачи не выполняются
- Проверьте логи сервиса
- Убедитесь, что агент зарегистрирован (проверьте в веб-интерфейсе статус ПК)
- Проверьте права доступа к временным директориям

### Установка завершается с ошибкой
- Проверьте, что установщик запускается от имени администратора
- Проверьте логи установки 1С
- Убедитесь, что дистрибутив совместим с архитектурой системы


