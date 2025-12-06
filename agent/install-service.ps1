# Скрипт установки 1C Updater Agent как Windows Service
# Требует запуска от имени администратора

param(
    [string]$ServiceName = "1CUpdaterAgent",
    [string]$DisplayName = "1C Updater Agent",
    [string]$Description = "Сервис для автоматической установки обновлений 1С на удаленных ПК",
    [string]$ExePath = "",
    [string]$ServerUrl = "http://localhost:3001",
    [int]$PcId = 0
)

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ОШИБКА: Скрипт должен быть запущен от имени администратора!" -ForegroundColor Red
    exit 1
}

# Определение пути к exe файлу
if ([string]::IsNullOrEmpty($ExePath)) {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ExePath = Join-Path $scriptPath "bin\Release\net8.0\1CUpdaterAgent.exe"
    
    if (-not (Test-Path $ExePath)) {
        $ExePath = Join-Path $scriptPath "bin\Debug\net8.0\1CUpdaterAgent.exe"
    }
}

if (-not (Test-Path $ExePath)) {
    Write-Host "ОШИБКА: Файл $ExePath не найден!" -ForegroundColor Red
    Write-Host "Сначала соберите проект: dotnet build -c Release" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Установка 1C Updater Agent ===" -ForegroundColor Cyan
Write-Host "Имя сервиса: $ServiceName" -ForegroundColor White
Write-Host "Путь к exe: $ExePath" -ForegroundColor White
Write-Host "URL сервера: $ServerUrl" -ForegroundColor White
Write-Host "ID ПК: $PcId" -ForegroundColor White

# Остановка и удаление существующего сервиса
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "`nОстановка существующего сервиса..." -ForegroundColor Yellow
    if ($existingService.Status -eq 'Running') {
        Stop-Service -Name $ServiceName -Force
        Start-Sleep -Seconds 2
    }
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 2
}

# Создание сервиса
Write-Host "`nСоздание сервиса..." -ForegroundColor Yellow
$result = sc.exe create $ServiceName binPath= "`"$ExePath`"" DisplayName= "$DisplayName" start= auto
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Не удалось создать сервис" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

# Установка описания
sc.exe description $ServiceName "$Description"

# Создание конфигурационного файла
Write-Host "`nСоздание конфигурационного файла..." -ForegroundColor Yellow
$configDir = "$env:ProgramData\1CUpdaterAgent"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

$configPath = Join-Path $configDir "config.json"
$config = @{
    ServerUrl = $ServerUrl
    PcId = $PcId
    AgentId = [guid]::NewGuid().ToString()
    PollIntervalSeconds = 30
    HeartbeatIntervalSeconds = 60
} | ConvertTo-Json -Depth 10

Set-Content -Path $configPath -Value $config -Encoding UTF8
Write-Host "Конфигурация сохранена: $configPath" -ForegroundColor Green

# Запуск сервиса
Write-Host "`nЗапуск сервиса..." -ForegroundColor Yellow
Start-Service -Name $ServiceName
Start-Sleep -Seconds 2

$service = Get-Service -Name $ServiceName
if ($service.Status -eq 'Running') {
    Write-Host "`n✅ Сервис успешно установлен и запущен!" -ForegroundColor Green
    Write-Host "`nСтатус: $($service.Status)" -ForegroundColor White
    Write-Host "Имя: $($service.DisplayName)" -ForegroundColor White
} else {
    Write-Host "`n⚠️  Сервис создан, но не запущен. Статус: $($service.Status)" -ForegroundColor Yellow
    Write-Host "Попробуйте запустить вручную: Start-Service -Name $ServiceName" -ForegroundColor Yellow
}

Write-Host "`n=== Установка завершена ===" -ForegroundColor Cyan
Write-Host "`nПолезные команды:" -ForegroundColor Yellow
Write-Host "  Остановить: Stop-Service -Name $ServiceName" -ForegroundColor White
Write-Host "  Запустить: Start-Service -Name $ServiceName" -ForegroundColor White
Write-Host "  Удалить: sc.exe delete $ServiceName" -ForegroundColor White
Write-Host "  Логи: Get-EventLog -LogName Application -Source $ServiceName -Newest 50" -ForegroundColor White



