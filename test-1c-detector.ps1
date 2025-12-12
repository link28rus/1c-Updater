# Скрипт для проверки работы GetLatest1CVersion()
# Запуск: .\test-1c-detector.ps1

Write-Host "=== Тест определения версии 1С ===" -ForegroundColor Cyan
Write-Host ""

# Собираем проект
Write-Host "1. Сборка проекта..." -ForegroundColor Yellow
cd agent
$buildResult = dotnet build -c Release 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка сборки!" -ForegroundColor Red
    $buildResult | Select-String -Pattern "error"
    exit 1
}
Write-Host "✅ Проект собран" -ForegroundColor Green
Write-Host ""

# Запускаем тест
Write-Host "2. Запуск теста GetLatest1CVersion()..." -ForegroundColor Yellow
Write-Host ""
$testResult = dotnet run -c Release -- test 2>&1
Write-Host $testResult

cd ..

Write-Host ""
Write-Host "=== Проверка завершена ===" -ForegroundColor Cyan

