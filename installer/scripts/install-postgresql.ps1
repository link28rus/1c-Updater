# Скрипт автоматической установки PostgreSQL
# Скачивает и устанавливает PostgreSQL 14+ если он не установлен

param(
    [string]$PostgresVersion = "16",
    [string]$InstallPath = "C:\Program Files\PostgreSQL\$PostgresVersion",
    [string]$DataPath = "C:\Program Files\PostgreSQL\$PostgresVersion\data",
    [string]$Superuser = "postgres",
    [string]$SuperuserPassword = "admin",
    [int]$Port = 5432
)

$ErrorActionPreference = "Stop"

Write-Host "=== Проверка и установка PostgreSQL ===" -ForegroundColor Green

# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ОШИБКА: Скрипт должен быть запущен от имени администратора!" -ForegroundColor Red
    exit 1
}

# Проверка, установлен ли PostgreSQL
Write-Host "`nПроверка установленного PostgreSQL..." -ForegroundColor Yellow

$postgresInstalled = $false
$installedVersion = $null

# Проверка через реестр
$regPaths = @(
    "HKLM:\SOFTWARE\PostgreSQL\Installations",
    "HKLM:\SOFTWARE\WOW6432Node\PostgreSQL\Installations"
)

foreach ($regPath in $regPaths) {
    if (Test-Path $regPath) {
        $versions = Get-ChildItem -Path $regPath -ErrorAction SilentlyContinue
        foreach ($version in $versions) {
            $versionName = Split-Path -Leaf $version.Name
            if ($versionName -match "^\d+$" -and [int]$versionName -ge 14) {
                $postgresInstalled = $true
                $installedVersion = $versionName
                $installPath = (Get-ItemProperty -Path $version.PSPath -Name "Base Directory" -ErrorAction SilentlyContinue).'Base Directory'
                Write-Host "Найден установленный PostgreSQL версии $installedVersion в $installPath" -ForegroundColor Green
                break
            }
        }
        if ($postgresInstalled) { break }
    }
}

# Проверка через psql в PATH
if (-not $postgresInstalled) {
    try {
        $psqlVersion = & psql --version 2>&1
        if ($psqlVersion -match "psql \(PostgreSQL\) (\d+)") {
            $versionNum = [int]$matches[1]
            if ($versionNum -ge 14) {
                $postgresInstalled = $true
                $installedVersion = $versionNum.ToString()
                Write-Host "Найден PostgreSQL версии $installedVersion в PATH" -ForegroundColor Green
            }
        }
    } catch {
        # psql не найден в PATH
    }
}

# Если PostgreSQL уже установлен, выходим
if ($postgresInstalled) {
    Write-Host "`nPostgreSQL уже установлен. Пропускаем установку." -ForegroundColor Green
    exit 0
}

Write-Host "PostgreSQL не найден. Начинаем установку..." -ForegroundColor Yellow

# Определение URL для скачивания PostgreSQL
$postgresUrl = "https://get.enterprisedb.com/postgresql/postgresql-$PostgresVersion-windows-x64.exe"
$tempPath = $env:TEMP
$installerPath = Join-Path $tempPath "postgresql-installer.exe"

# Скачивание установщика
Write-Host "`nСкачивание установщика PostgreSQL $PostgresVersion..." -ForegroundColor Yellow
Write-Host "URL: $postgresUrl" -ForegroundColor Gray

try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $postgresUrl -OutFile $installerPath -UseBasicParsing
    $ProgressPreference = 'Continue'
    
    if (-not (Test-Path $installerPath)) {
        throw "Файл не был скачан"
    }
    
    $fileSize = (Get-Item $installerPath).Length / 1MB
    Write-Host "Установщик скачан успешно ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
} catch {
    Write-Host "ОШИБКА: Не удалось скачать установщик PostgreSQL!" -ForegroundColor Red
    Write-Host "Ошибка: $_" -ForegroundColor Red
    Write-Host "`nПопробуйте скачать вручную с https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Подготовка параметров для тихой установки
Write-Host "`nУстановка PostgreSQL (это может занять несколько минут)..." -ForegroundColor Yellow

# Создание файла ответов для тихой установки
$responseFile = Join-Path $tempPath "postgresql-install-response.txt"
$responseContent = @"
mode=unattended
enable-components=server,commandlinetools
superpassword=$SuperuserPassword
servicename=postgresql-x64-$PostgresVersion
servicepassword=$SuperuserPassword
serverport=$Port
"@

Set-Content -Path $responseFile -Value $responseContent -Encoding ASCII

# Запуск установщика
$installArgs = "--unattendedmodeui none --mode unattended --optionfile `"$responseFile`" --disable-components=pgAdmin4,stackbuilder"

try {
    $process = Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -eq 0) {
        Write-Host "PostgreSQL установлен успешно!" -ForegroundColor Green
    } else {
        Write-Host "ОШИБКА: Установка PostgreSQL завершилась с кодом $($process.ExitCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ОШИБКА: Не удалось запустить установщик PostgreSQL!" -ForegroundColor Red
    Write-Host "Ошибка: $_" -ForegroundColor Red
    exit 1
} finally {
    # Очистка временных файлов
    if (Test-Path $installerPath) {
        Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $responseFile) {
        Remove-Item -Path $responseFile -Force -ErrorAction SilentlyContinue
    }
}

# Ожидание запуска службы PostgreSQL
Write-Host "`nОжидание запуска службы PostgreSQL..." -ForegroundColor Yellow
$serviceName = "postgresql-x64-$PostgresVersion"
$maxWait = 60
$waited = 0

while ($waited -lt $maxWait) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq 'Running') {
        Write-Host "Служба PostgreSQL запущена" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
    $waited += 2
    Write-Host "." -NoNewline -ForegroundColor Gray
}

if ($waited -ge $maxWait) {
    Write-Host "`nПРЕДУПРЕЖДЕНИЕ: Служба PostgreSQL не запустилась автоматически" -ForegroundColor Yellow
    Write-Host "Попробуйте запустить вручную: Start-Service -Name `"$serviceName`"" -ForegroundColor Yellow
}

# Добавление PostgreSQL в PATH (опционально)
$pgBinPath = Join-Path $InstallPath "bin"
if (Test-Path $pgBinPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if ($currentPath -notlike "*$pgBinPath*") {
        Write-Host "`nДобавление PostgreSQL в системный PATH..." -ForegroundColor Yellow
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$pgBinPath", "Machine")
        $env:Path += ";$pgBinPath"
        Write-Host "PostgreSQL добавлен в PATH" -ForegroundColor Green
    }
}

Write-Host "`n=== Установка PostgreSQL завершена ===" -ForegroundColor Green
Write-Host "Версия: PostgreSQL $PostgresVersion" -ForegroundColor White
Write-Host "Путь установки: $InstallPath" -ForegroundColor White
Write-Host "Порт: $Port" -ForegroundColor White
Write-Host "Пользователь: $Superuser" -ForegroundColor White
Write-Host "`nВАЖНО: Запомните пароль суперпользователя: $SuperuserPassword" -ForegroundColor Yellow

