# Скрипт создания базы данных PostgreSQL

param(
    [string]$DbName = "1c_updater",
    [string]$DbUser = "postgres",
    [string]$DbPassword = "admin",
    [string]$Host = "localhost",
    [int]$Port = 5432
)

$ErrorActionPreference = "Stop"

Write-Host "=== Создание базы данных PostgreSQL ===" -ForegroundColor Green

# Поиск psql
$psqlPath = $null

# Проверка в PATH
try {
    $null = & psql --version 2>&1
    $psqlPath = "psql"
} catch {
    # Поиск в стандартных путях установки PostgreSQL
    $pgPaths = @(
        "C:\Program Files\PostgreSQL\*\bin\psql.exe",
        "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe"
    )
    
    foreach ($path in $pgPaths) {
        $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $psqlPath = $found.FullName
            Write-Host "Найден PostgreSQL: $psqlPath" -ForegroundColor Gray
            break
        }
    }
}

if (-not $psqlPath) {
    Write-Host "ОШИБКА: PostgreSQL не найден!" -ForegroundColor Red
    Write-Host "Убедитесь, что PostgreSQL установлен и добавлен в PATH" -ForegroundColor Yellow
    exit 1
}

# Проверка существования базы данных
Write-Host "`nПроверка существования базы данных '$DbName'..." -ForegroundColor Yellow

$env:PGPASSWORD = $DbPassword
$checkDbQuery = "SELECT 1 FROM pg_database WHERE datname = '$DbName';"

try {
    $result = & $psqlPath -U $DbUser -h $Host -p $Port -t -c $checkDbQuery 2>&1
    $dbExists = ($result -match "^\s*1\s*$")
    
    if ($dbExists) {
        Write-Host "База данных '$DbName' уже существует" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "Не удалось проверить базу данных. Продолжаем создание..." -ForegroundColor Yellow
}

# Создание базы данных
Write-Host "`nСоздание базы данных '$DbName'..." -ForegroundColor Yellow

$createDbQuery = "CREATE DATABASE `"$DbName`" WITH OWNER = $DbUser ENCODING = 'UTF8' LC_COLLATE = 'Russian_Russia.1251' LC_CTYPE = 'Russian_Russia.1251';"

try {
    $result = & $psqlPath -U $DbUser -h $Host -p $Port -c $createDbQuery 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "База данных '$DbName' создана успешно!" -ForegroundColor Green
    } else {
        # Возможно, база уже существует
        if ($result -match "already exists") {
            Write-Host "База данных '$DbName' уже существует" -ForegroundColor Green
        } else {
            Write-Host "ОШИБКА: Не удалось создать базу данных" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "ОШИБКА: Не удалось создать базу данных" -ForegroundColor Red
    Write-Host "Ошибка: $_" -ForegroundColor Red
    exit 1
}

# Применение SQL скрипта, если он существует
$sqlScript = Join-Path $PSScriptRoot "..\..\create-db.sql"
if (Test-Path $sqlScript) {
    Write-Host "`nПрименение SQL скрипта..." -ForegroundColor Yellow
    try {
        & $psqlPath -U $DbUser -h $Host -p $Port -d $DbName -f $sqlScript 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SQL скрипт применен успешно" -ForegroundColor Green
        }
    } catch {
        Write-Host "ПРЕДУПРЕЖДЕНИЕ: Не удалось применить SQL скрипт" -ForegroundColor Yellow
    }
}

Write-Host "`n=== База данных настроена ===" -ForegroundColor Green
Write-Host "Имя: $DbName" -ForegroundColor White
Write-Host "Хост: $Host" -ForegroundColor White
Write-Host "Порт: $Port" -ForegroundColor White
Write-Host "Пользователь: $DbUser" -ForegroundColor White

