# Скрипт запуска для разработки (Windows)

Write-Host "Запуск системы обновления 1С в режиме разработки..." -ForegroundColor Green

# Проверка .env
if (-not (Test-Path "backend\.env")) {
    Write-Host "ОШИБКА: Файл backend\.env не найден!" -ForegroundColor Red
    Write-Host "Скопируйте backend\.env.example в backend\.env и настройте его" -ForegroundColor Yellow
    exit 1
}

# Запуск Backend в отдельном окне
Write-Host "Запуск Backend на http://localhost:3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run start:dev"

# Небольшая задержка для запуска backend
Start-Sleep -Seconds 3

# Запуск Frontend в отдельном окне
Write-Host "Запуск Frontend на http://localhost:5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`nСерверы запущены!" -ForegroundColor Green
Write-Host "Backend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "`nНажмите любую клавишу для остановки..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")




