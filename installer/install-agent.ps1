# Скрипт установки 1C Updater Agent как Windows Service
# Адаптированная версия для использования в установщике

param(
    [string]$ServiceName = "1CUpdaterAgent",
    [string]$DisplayName = "1C Updater Agent",
    [string]$Description = "Сервис для автоматической установки обновлений 1С на удаленных ПК",
    [string]$InstallPath = "C:\Program Files\1c-Updater",
    [string]$ServerUrl = "http://localhost:3001",
    [int]$PcId = 0
)

$ErrorActionPreference = "Stop"

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ОШИБКА: Скрипт должен быть запущен от имени администратора!" -ForegroundColor Red
    exit 1
}

# Определение пути к exe файлу
$agentPath = Join-Path $InstallPath "agent"
$exePath = Join-Path $agentPath "1CUpdaterAgent.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "ОШИБКА: Файл $exePath не найден!" -ForegroundColor Red
    Write-Host "Убедитесь, что агент установлен в $agentPath" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n=== Установка 1C Updater Agent ===" -ForegroundColor Cyan
Write-Host "Имя сервиса: $ServiceName" -ForegroundColor White
Write-Host "Путь к exe: $exePath" -ForegroundColor White
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
$result = sc.exe create $ServiceName binPath= "`"$exePath`"" DisplayName= "$DisplayName" start= auto
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

