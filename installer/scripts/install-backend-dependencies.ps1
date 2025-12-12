# Скрипт установки зависимостей backend

param(
    [string]$InstallPath = "C:\Program Files\1c-Updater"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Установка зависимостей Backend ===" -ForegroundColor Green

$backendPath = Join-Path $InstallPath "backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "ОШИБКА: Папка backend не найдена: $backendPath" -ForegroundColor Red
    exit 1
}

# Проверка наличия node_modules
if (Test-Path (Join-Path $backendPath "node_modules")) {
    Write-Host "Зависимости уже установлены, пропускаем..." -ForegroundColor Yellow
    exit 0
}

# Проверка наличия package.json
if (-not (Test-Path (Join-Path $backendPath "package.json"))) {
    Write-Host "ОШИБКА: package.json не найден!" -ForegroundColor Red
    exit 1
}

# Установка зависимостей
Write-Host "Установка зависимостей backend (это может занять несколько минут)..." -ForegroundColor Yellow
Set-Location $backendPath

try {
    # Используем npm ci для production зависимостей
    npm ci --production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ОШИБКА: Не удалось установить зависимости!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Зависимости установлены успешно" -ForegroundColor Green
} catch {
    Write-Host "ОШИБКА: Не удалось установить зависимости!" -ForegroundColor Red
    Write-Host "Ошибка: $_" -ForegroundColor Red
    exit 1
} finally {
    Set-Location $PSScriptRoot
}

Write-Host "=== Установка зависимостей завершена ===" -ForegroundColor Green


