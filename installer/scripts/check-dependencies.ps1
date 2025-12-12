# Скрипт проверки зависимостей системы

$ErrorActionPreference = "Continue"

$dependencies = @{
    ".NET 8 Runtime" = @{
        Check = {
            # Проверка через реестр
            $regPaths = @(
                "HKLM:\SOFTWARE\dotnet\Setup\InstalledVersions\x64\sharedhost",
                "HKLM:\SOFTWARE\WOW6432Node\dotnet\Setup\InstalledVersions\x64\sharedhost"
            )
            
            foreach ($regPath in $regPaths) {
                if (Test-Path $regPath) {
                    $version = (Get-ItemProperty -Path $regPath -Name "Version" -ErrorAction SilentlyContinue).Version
                    if ($version -and $version -match "^8\.\d+") {
                        return @{ Installed = $true; Version = $version }
                    }
                }
            }
            
            # Проверка через dotnet --version
            try {
                $dotnetVersion = & dotnet --version 2>&1
                if ($dotnetVersion -match "^8\.\d+") {
                    return @{ Installed = $true; Version = $dotnetVersion }
                }
            } catch {
                # dotnet не найден
            }
            
            return @{ Installed = $false; Version = $null }
        }
        DownloadUrl = "https://dotnet.microsoft.com/download/dotnet/8.0"
    }
    
    "Node.js LTS" = @{
        Check = {
            try {
                $nodeVersion = & node --version 2>&1
                if ($nodeVersion) {
                    $versionNum = [int]($nodeVersion -replace '^v(\d+)\..*', '$1')
                    if ($versionNum -ge 18) {
                        return @{ Installed = $true; Version = $nodeVersion }
                    }
                }
            } catch {
                # node не найден
            }
            
            return @{ Installed = $false; Version = $null }
        }
        DownloadUrl = "https://nodejs.org/"
    }
    
    "PostgreSQL 14+" = @{
        Check = {
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
                            return @{ Installed = $true; Version = $versionName }
                        }
                    }
                }
            }
            
            # Проверка через psql
            try {
                $psqlVersion = & psql --version 2>&1
                if ($psqlVersion -match "psql \(PostgreSQL\) (\d+)") {
                    $versionNum = [int]$matches[1]
                    if ($versionNum -ge 14) {
                        return @{ Installed = $true; Version = $versionNum.ToString() }
                    }
                }
            } catch {
                # psql не найден
            }
            
            return @{ Installed = $false; Version = $null }
        }
        DownloadUrl = "https://www.postgresql.org/download/windows/"
    }
}

Write-Host "=== Проверка зависимостей ===" -ForegroundColor Green
Write-Host ""

$allInstalled = $true
$results = @{}

foreach ($depName in $dependencies.Keys) {
    $dep = $dependencies[$depName]
    Write-Host "Проверка: $depName..." -NoNewline -ForegroundColor Yellow
    
    $result = & $dep.Check
    $results[$depName] = $result
    
    if ($result.Installed) {
        Write-Host " УСТАНОВЛЕН (версия: $($result.Version))" -ForegroundColor Green
    } else {
        Write-Host " НЕ УСТАНОВЛЕН" -ForegroundColor Red
        Write-Host "  Скачать: $($dep.DownloadUrl)" -ForegroundColor Gray
        $allInstalled = $false
    }
}

Write-Host ""

if ($allInstalled) {
    Write-Host "Все зависимости установлены!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Некоторые зависимости отсутствуют!" -ForegroundColor Yellow
    exit 1
}

