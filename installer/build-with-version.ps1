# Скрипт для сборки установщика с автоматическим увеличением версии
# Использование: .\build-with-version.ps1 [major|minor|build|none]
# По умолчанию увеличивает build версию

param(
    [Parameter(Position=0)]
    [ValidateSet("major", "minor", "build", "none")]
    [string]$IncrementType = "build"
)

Write-Host "=== Сборка установщика с версией ===" -ForegroundColor Cyan
Write-Host ""

# Увеличиваем версию (если не указано "none")
if ($IncrementType -ne "none") {
    Write-Host "Увеличение версии ($IncrementType)..." -ForegroundColor Yellow
    & "$PSScriptRoot\increment-version.ps1" -IncrementType $IncrementType
    Write-Host ""
}

# Читаем текущую версию
$versionFile = Join-Path $PSScriptRoot "version.txt"
if (Test-Path $versionFile) {
    $version = (Get-Content $versionFile -Raw).Trim()
    Write-Host "Версия установщика: $version" -ForegroundColor Green
} else {
    $version = "1.0.0"
    Write-Host "Версия не найдена, используем: $version" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Сборка установщика..." -ForegroundColor Yellow

# Собираем проект
$publishPath = "bin\Release\net8.0-windows\win-x64\publish"
$outputFile = "1CUpdaterAgentInstaller-v$version.exe"

# Удаляем старый файл, если есть
$oldFile = Join-Path $publishPath "1CUpdaterAgentInstaller.exe"
if (Test-Path $oldFile) {
    Remove-Item $oldFile -Force -ErrorAction SilentlyContinue
}

# Собираем
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:Version=$version

if ($LASTEXITCODE -eq 0) {
    $builtFile = Join-Path $publishPath "1CUpdaterAgentInstaller.exe"
    if (Test-Path $builtFile) {
        $newFile = Join-Path $publishPath $outputFile
        Copy-Item $builtFile $newFile -Force
        Write-Host ""
        Write-Host "✅ Установщик собран успешно!" -ForegroundColor Green
        Write-Host "   Файл: $newFile" -ForegroundColor White
        $fileInfo = Get-Item $newFile
        Write-Host "   Размер: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
        Write-Host "   Версия: $version" -ForegroundColor Gray
    } else {
        Write-Host "❌ Файл установщика не найден после сборки" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Ошибка сборки" -ForegroundColor Red
    exit 1
}

