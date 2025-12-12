# Скрипт настройки конфигурации backend (.env файл)

param(
    [string]$InstallPath = "C:\Program Files\1c-Updater",
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbUser = "postgres",
    [string]$DbPassword = "admin",
    [string]$DbName = "1c_updater",
    [string]$JwtSecret = "",
    [int]$Port = 3001,
    [string]$NodeEnv = "production"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Настройка конфигурации Backend ===" -ForegroundColor Green

$backendPath = Join-Path $InstallPath "backend"
$envPath = Join-Path $backendPath ".env"

if (-not (Test-Path $backendPath)) {
    Write-Host "ОШИБКА: Папка backend не найдена: $backendPath" -ForegroundColor Red
    exit 1
}

# Генерация JWT секрета, если не указан
if ([string]::IsNullOrEmpty($JwtSecret)) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $JwtSecret = [Convert]::ToBase64String($bytes)
    Write-Host "Сгенерирован новый JWT секрет" -ForegroundColor Gray
}

# Создание содержимого .env файла
$envContent = @"
# Database Configuration
DB_HOST=$DbHost
DB_PORT=$DbPort
DB_USERNAME=$DbUser
DB_PASSWORD=$DbPassword
DB_DATABASE=$DbName

# JWT Configuration
JWT_SECRET=$JwtSecret
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=$Port
NODE_ENV=$NodeEnv

# Upload Configuration
UPLOAD_DIR=./uploads/distributions

# Encryption Secret (для шифрования паролей ПК)
ENCRYPTION_SECRET=$JwtSecret

# Frontend URL
FRONTEND_URL=http://localhost:$Port

# Server URL
SERVER_URL=http://localhost:$Port
"@

# Запись .env файла
try {
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8 -Force
    Write-Host "Конфигурация сохранена: $envPath" -ForegroundColor Green
} catch {
    Write-Host "ОШИБКА: Не удалось создать .env файл" -ForegroundColor Red
    Write-Host "Ошибка: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Конфигурация Backend создана ===" -ForegroundColor Green
Write-Host "Файл: $envPath" -ForegroundColor White

