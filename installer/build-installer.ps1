# Скрипт предварительной сборки всех компонентов для установщика
# Собирает backend, frontend, agent и копирует все в installer/dist/

param(
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Split-Path -Parent $scriptPath
$distPath = Join-Path $scriptPath "dist"

Write-Host "=== Сборка компонентов для установщика ===" -ForegroundColor Green
Write-Host "Корневая папка: $rootPath" -ForegroundColor Gray
Write-Host "Папка назначения: $distPath" -ForegroundColor Gray

# Очистка папки dist, если указан флаг Clean
if ($Clean -and (Test-Path $distPath)) {
    Write-Host "`nОчистка папки dist..." -ForegroundColor Yellow
    Remove-Item -Path $distPath -Recurse -Force
}

# Создание папки dist
if (-not (Test-Path $distPath)) {
    New-Item -ItemType Directory -Path $distPath -Force | Out-Null
}

# 1. Сборка Backend
Write-Host "`n[1/3] Сборка Backend..." -ForegroundColor Cyan
$backendPath = Join-Path $rootPath "backend"
Set-Location $backendPath

# Установка зависимостей, если нужно
if (-not (Test-Path "node_modules")) {
    Write-Host "Установка зависимостей backend..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ОШИБКА: Не удалось установить зависимости backend!" -ForegroundColor Red
        exit 1
    }
}

# Сборка backend
Write-Host "Сборка backend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Не удалось собрать backend!" -ForegroundColor Red
    exit 1
}

# Копирование backend в dist
$backendDistPath = Join-Path $distPath "backend"
if (Test-Path $backendDistPath) {
    Remove-Item -Path $backendDistPath -Recurse -Force
}
New-Item -ItemType Directory -Path $backendDistPath -Force | Out-Null

# Копируем dist, package.json, и создаем uploads
Copy-Item -Path "dist" -Destination $backendDistPath -Recurse -Force
Copy-Item -Path "package.json" -Destination $backendDistPath -Force
New-Item -ItemType Directory -Path (Join-Path $backendDistPath "uploads\distributions") -Force | Out-Null

Write-Host "Backend собран успешно" -ForegroundColor Green

# 2. Сборка Frontend
Write-Host "`n[2/3] Сборка Frontend..." -ForegroundColor Cyan
$frontendPath = Join-Path $rootPath "frontend"
Set-Location $frontendPath

# Установка зависимостей, если нужно
if (-not (Test-Path "node_modules")) {
    Write-Host "Установка зависимостей frontend..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ОШИБКА: Не удалось установить зависимости frontend!" -ForegroundColor Red
        exit 1
    }
}

# Сборка frontend
Write-Host "Сборка frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Не удалось собрать frontend!" -ForegroundColor Red
    exit 1
}

# Копирование frontend в dist
$frontendDistPath = Join-Path $distPath "frontend"
if (Test-Path $frontendDistPath) {
    Remove-Item -Path $frontendDistPath -Recurse -Force
}
New-Item -ItemType Directory -Path $frontendDistPath -Force | Out-Null

Copy-Item -Path "dist" -Destination $frontendDistPath -Recurse -Force

Write-Host "Frontend собран успешно" -ForegroundColor Green

# 3. Публикация Agent как self-contained
Write-Host "`n[3/3] Публикация Agent (self-contained)..." -ForegroundColor Cyan
$agentPath = Join-Path $rootPath "agent"
Set-Location $agentPath

# Публикация agent как self-contained
Write-Host "Публикация agent..." -ForegroundColor Yellow
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true

if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Не удалось опубликовать agent!" -ForegroundColor Red
    exit 1
}

# Копирование agent в dist
$agentDistPath = Join-Path $distPath "agent"
if (Test-Path $agentDistPath) {
    Remove-Item -Path $agentDistPath -Recurse -Force
}
New-Item -ItemType Directory -Path $agentDistPath -Force | Out-Null

$agentPublishPath = Join-Path $agentPath "bin\Release\net8.0\win-x64\publish"
if (-not (Test-Path $agentPublishPath)) {
    Write-Host "ОШИБКА: Папка публикации agent не найдена: $agentPublishPath" -ForegroundColor Red
    exit 1
}

Copy-Item -Path (Join-Path $agentPublishPath "1CUpdaterAgent.exe") -Destination $agentDistPath -Force

Write-Host "Agent опубликован успешно" -ForegroundColor Green

# 4. Копирование скриптов и SQL файлов
Write-Host "`n[4/4] Копирование скриптов и SQL..." -ForegroundColor Cyan

$scriptsDistPath = Join-Path $distPath "scripts"
if (-not (Test-Path $scriptsDistPath)) {
    New-Item -ItemType Directory -Path $scriptsDistPath -Force | Out-Null
}

# Копируем SQL файл
$sqlFile = Join-Path $rootPath "create-db.sql"
if (Test-Path $sqlFile) {
    Copy-Item -Path $sqlFile -Destination $scriptsDistPath -Force
    Write-Host "Скопирован create-db.sql" -ForegroundColor Gray
}

# Копируем create-database.ps1
$createDbScript = Join-Path $rootPath "create-database.ps1"
if (Test-Path $createDbScript) {
    Copy-Item -Path $createDbScript -Destination $scriptsDistPath -Force
    Write-Host "Скопирован create-database.ps1" -ForegroundColor Gray
}

# Копируем install-agent.ps1 из agent, если существует
$agentInstallScript = Join-Path $agentPath "install-service.ps1"
if (Test-Path $agentInstallScript) {
    Copy-Item -Path $agentInstallScript -Destination (Join-Path $scriptsDistPath "install-agent.ps1") -Force
    Write-Host "Скопирован install-agent.ps1" -ForegroundColor Gray
}

# Копируем все скрипты из installer/scripts
$installerScriptsPath = Join-Path $scriptPath "scripts"
if (Test-Path $installerScriptsPath) {
    $installerScripts = Get-ChildItem -Path $installerScriptsPath -Filter "*.ps1" -ErrorAction SilentlyContinue
    foreach ($script in $installerScripts) {
        Copy-Item -Path $script.FullName -Destination $scriptsDistPath -Force
        Write-Host "Скопирован $($script.Name)" -ForegroundColor Gray
    }
}

# Копируем install-agent.ps1 из installer (если существует)
$installerAgentScript = Join-Path $scriptPath "install-agent.ps1"
if (Test-Path $installerAgentScript) {
    Copy-Item -Path $installerAgentScript -Destination (Join-Path $distPath "install-agent.ps1") -Force
    Write-Host "Скопирован install-agent.ps1 в корень dist" -ForegroundColor Gray
}

# Копируем package.json из backend для установки зависимостей
$backendPackageJson = Join-Path $rootPath "backend\package.json"
if (Test-Path $backendPackageJson) {
    $backendDistPath = Join-Path $distPath "backend"
    Copy-Item -Path $backendPackageJson -Destination $backendDistPath -Force
    Write-Host "Скопирован backend\package.json" -ForegroundColor Gray
}

Write-Host "`n=== Сборка завершена успешно! ===" -ForegroundColor Green
Write-Host "Все компоненты собраны в: $distPath" -ForegroundColor Gray
Write-Host "`nСтруктура:" -ForegroundColor Yellow
Write-Host "  - backend/dist/" -ForegroundColor White
Write-Host "  - frontend/dist/" -ForegroundColor White
Write-Host "  - agent/1CUpdaterAgent.exe" -ForegroundColor White
Write-Host "  - scripts/" -ForegroundColor White

Set-Location $rootPath

