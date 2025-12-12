# Скрипт установки backend как Windows Service

param(
    [string]$InstallPath = "C:\Program Files\1c-Updater",
    [string]$ServiceName = "1CUpdaterBackend",
    [string]$DisplayName = "1C Updater Backend",
    [string]$Description = "Backend сервис системы удаленного обновления 1С"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Установка Backend как Windows Service ===" -ForegroundColor Green

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ОШИБКА: Скрипт должен быть запущен от имени администратора!" -ForegroundColor Red
    exit 1
}

$backendPath = Join-Path $InstallPath "backend"
$distPath = Join-Path $backendPath "dist"
$mainJs = Join-Path $distPath "main.js"
$nodePath = "node"

# Проверка существования файлов
if (-not (Test-Path $mainJs)) {
    Write-Host "ОШИБКА: Файл main.js не найден: $mainJs" -ForegroundColor Red
    exit 1
}

# Проверка Node.js
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "Найден Node.js: $nodeVersion" -ForegroundColor Gray
} catch {
    Write-Host "ОШИБКА: Node.js не найден в PATH!" -ForegroundColor Red
    exit 1
}

# Проверка node-windows (для установки как службы)
Write-Host "`nПроверка node-windows..." -ForegroundColor Yellow

$nodeWindowsPath = Join-Path $backendPath "node_modules\node-windows"
if (-not (Test-Path $nodeWindowsPath)) {
    Write-Host "Установка node-windows..." -ForegroundColor Yellow
    Set-Location $backendPath
    npm install node-windows --save
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ОШИБКА: Не удалось установить node-windows!" -ForegroundColor Red
        exit 1
    }
}

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

# Создание скрипта установки службы
$installScript = @"
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: '$ServiceName',
  description: '$Description',
  script: path.join(__dirname, 'dist', 'main.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

svc.on('install', function() {
  console.log('Служба установлена');
  svc.start();
});

svc.on('start', function() {
  console.log('Служба запущена');
});

svc.on('error', function(err) {
  console.error('Ошибка:', err);
});

svc.install();
"@

$installScriptPath = Join-Path $backendPath "install-service.js"
Set-Content -Path $installScriptPath -Value $installScript -Encoding UTF8

# Установка службы
Write-Host "`nУстановка службы..." -ForegroundColor Yellow
Set-Location $backendPath
node install-service.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Служба установлена и запущена!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Служба установлена, но могут быть ошибки" -ForegroundColor Yellow
}

# Удаление временного скрипта
if (Test-Path $installScriptPath) {
    Remove-Item -Path $installScriptPath -Force -ErrorAction SilentlyContinue
}

# Проверка статуса
Start-Sleep -Seconds 3
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "`nСтатус службы: $($service.Status)" -ForegroundColor White
    Write-Host "Имя: $($service.DisplayName)" -ForegroundColor White
} else {
    Write-Host "`nПРЕДУПРЕЖДЕНИЕ: Служба не найдена" -ForegroundColor Yellow
}

Write-Host "`n=== Установка завершена ===" -ForegroundColor Green

