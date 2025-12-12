# Скрипт для автоматического увеличения версии установщика
# Использование: .\increment-version.ps1 [major|minor|build]

param(
    [Parameter(Position=0)]
    [ValidateSet("major", "minor", "build")]
    [string]$IncrementType = "build"
)

$versionFile = "version.txt"

if (-not (Test-Path $versionFile)) {
    Write-Host "Файл version.txt не найден. Создаю с версией 1.0.0" -ForegroundColor Yellow
    "1.0.0" | Out-File -FilePath $versionFile -Encoding UTF8
}

$currentVersion = (Get-Content $versionFile -Raw).Trim()
Write-Host "Текущая версия: $currentVersion" -ForegroundColor Cyan

$parts = $currentVersion.Split('.')
if ($parts.Length -ne 3) {
    Write-Host "Ошибка: Неверный формат версии. Ожидается X.Y.Z" -ForegroundColor Red
    exit 1
}

$major = [int]$parts[0]
$minor = [int]$parts[1]
$build = [int]$parts[2]

switch ($IncrementType) {
    "major" {
        $major++
        $minor = 0
        $build = 0
    }
    "minor" {
        $minor++
        $build = 0
    }
    "build" {
        $build++
    }
}

$newVersion = "$major.$minor.$build"
Write-Host "Новая версия: $newVersion" -ForegroundColor Green

$newVersion | Set-Content -Path $versionFile -Encoding UTF8
Write-Host "Версия обновлена в $versionFile" -ForegroundColor Green

