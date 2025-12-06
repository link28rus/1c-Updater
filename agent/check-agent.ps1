# Скрипт проверки установки и работы 1C Updater Agent
# Запускать от имени администратора для полной проверки

param(
    [string]$ServiceName = "1CUpdaterAgent",
    [string]$ServerUrl = "http://localhost:3001"
)

Write-Host "`n=== Проверка установки 1C Updater Agent ===" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка существования сервиса
Write-Host "1. Проверка сервиса Windows..." -ForegroundColor Yellow
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($service) {
    Write-Host "   ✅ Сервис найден: $($service.DisplayName)" -ForegroundColor Green
    Write-Host "   Статус: $($service.Status)" -ForegroundColor $(if ($service.Status -eq 'Running') { 'Green' } else { 'Yellow' })
    Write-Host "   Тип запуска: $($service.StartType)" -ForegroundColor White
} else {
    Write-Host "   ❌ Сервис не найден!" -ForegroundColor Red
    Write-Host "   Агент не установлен. Используйте install-service.ps1 для установки." -ForegroundColor Yellow
    exit 1
}

# 2. Проверка конфигурационного файла
Write-Host "`n2. Проверка конфигурации..." -ForegroundColor Yellow
$configPath = "$env:ProgramData\1CUpdaterAgent\config.json"

if (Test-Path $configPath) {
    Write-Host "   ✅ Конфигурационный файл найден: $configPath" -ForegroundColor Green
    try {
        $config = Get-Content $configPath | ConvertFrom-Json
        Write-Host "   ServerUrl: $($config.ServerUrl)" -ForegroundColor White
        Write-Host "   PcId: $($config.PcId)" -ForegroundColor White
        Write-Host "   AgentId: $($config.AgentId)" -ForegroundColor White
        Write-Host "   PollIntervalSeconds: $($config.PollIntervalSeconds)" -ForegroundColor White
        Write-Host "   HeartbeatIntervalSeconds: $($config.HeartbeatIntervalSeconds)" -ForegroundColor White
    } catch {
        Write-Host "   ⚠️  Ошибка чтения конфигурации: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Конфигурационный файл не найден: $configPath" -ForegroundColor Red
}

# 3. Проверка подключения к серверу
Write-Host "`n3. Проверка подключения к серверу..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$ServerUrl/api/agent/status" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Сервер доступен: $ServerUrl" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Не удалось подключиться к серверу: $ServerUrl" -ForegroundColor Yellow
    Write-Host "   Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Убедитесь, что бэкенд запущен и доступен." -ForegroundColor Yellow
}

# 4. Проверка логов Windows Event Log
Write-Host "`n4. Проверка логов сервиса..." -ForegroundColor Yellow
try {
    $logs = Get-EventLog -LogName Application -Source $ServiceName -Newest 10 -ErrorAction SilentlyContinue
    if ($logs) {
        Write-Host "   ✅ Найдено записей в логах: $($logs.Count)" -ForegroundColor Green
        Write-Host "   Последние записи:" -ForegroundColor White
        $logs | Select-Object -First 5 | ForEach-Object {
            $color = if ($_.EntryType -eq 'Error') { 'Red' } elseif ($_.EntryType -eq 'Warning') { 'Yellow' } else { 'Green' }
            Write-Host "   [$($_.TimeGenerated)] [$($_.EntryType)] $($_.Message)" -ForegroundColor $color
        }
    } else {
        Write-Host "   ⚠️  Логи не найдены (сервис может быть недавно установлен)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Не удалось прочитать логи: $_" -ForegroundColor Yellow
}

# 5. Проверка регистрации на сервере (требует авторизации)
Write-Host "`n5. Проверка регистрации агента на сервере..." -ForegroundColor Yellow
Write-Host "   ℹ️  Для проверки регистрации откройте веб-интерфейс:" -ForegroundColor Cyan
Write-Host "   http://localhost:5173/agents" -ForegroundColor White
Write-Host "   или" -ForegroundColor White
Write-Host "   http://192.168.25.200:5173/agents" -ForegroundColor White

# 6. Проверка сетевых подключений
Write-Host "`n6. Проверка сетевых подключений..." -ForegroundColor Yellow
$process = Get-Process -Name "1CUpdaterAgent" -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "   ✅ Процесс агента запущен (PID: $($process.Id))" -ForegroundColor Green
    try {
        $connections = Get-NetTCPConnection -OwningProcess $process.Id -ErrorAction SilentlyContinue
        if ($connections) {
            Write-Host "   Активные подключения:" -ForegroundColor White
            $connections | ForEach-Object {
                Write-Host "   $($_.LocalAddress):$($_.LocalPort) -> $($_.RemoteAddress):$($_.RemotePort) ($($_.State))" -ForegroundColor White
            }
        }
    } catch {
        Write-Host "   ⚠️  Не удалось получить информацию о подключениях" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Процесс агента не найден (сервис может быть остановлен)" -ForegroundColor Yellow
}

# Итоговая информация
Write-Host "`n=== Резюме ===" -ForegroundColor Cyan
if ($service.Status -eq 'Running') {
    Write-Host "✅ Сервис работает" -ForegroundColor Green
} else {
    Write-Host "❌ Сервис не запущен. Запустите: Start-Service -Name $ServiceName" -ForegroundColor Red
}

Write-Host "`nПолезные команды:" -ForegroundColor Yellow
Write-Host "  Проверить статус: Get-Service -Name $ServiceName" -ForegroundColor White
Write-Host "  Запустить: Start-Service -Name $ServiceName" -ForegroundColor White
Write-Host "  Остановить: Stop-Service -Name $ServiceName" -ForegroundColor White
Write-Host "  Перезапустить: Restart-Service -Name $ServiceName" -ForegroundColor White
Write-Host "  Просмотр логов: Get-EventLog -LogName Application -Source $ServiceName -Newest 50" -ForegroundColor White
Write-Host ""


