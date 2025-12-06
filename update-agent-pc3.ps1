# Скрипт для обновления агента на ПК 3
# Путь к новому агенту
$newAgentPath = "C:\Users\link2\Downloads\1CUpdaterAgent.exe"

Write-Host "=== Обновление 1C Updater Agent ===" -ForegroundColor Cyan
Write-Host ""

# Проверяем наличие нового агента
if (-not (Test-Path $newAgentPath)) {
    Write-Host "❌ ОШИБКА: Файл агента не найден: $newAgentPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Новый агент найден: $newAgentPath" -ForegroundColor Green
$fileInfo = Get-Item $newAgentPath
Write-Host "   Размер: $([math]::Round($fileInfo.Length/1MB, 2)) MB" -ForegroundColor White
Write-Host "   Дата: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
Write-Host ""

# Останавливаем службу
Write-Host "Остановка службы 1CUpdaterAgent..." -ForegroundColor Yellow
try {
    $service = Get-Service -Name "1CUpdaterAgent" -ErrorAction Stop
    if ($service.Status -eq 'Running') {
        Stop-Service -Name "1CUpdaterAgent" -Force
        Start-Sleep -Seconds 2
        Write-Host "✅ Служба остановлена" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Служба уже остановлена" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ОШИБКА: Служба не найдена!" -ForegroundColor Red
    exit 1
}

# Находим путь к текущему exe
Write-Host ""
Write-Host "Поиск пути к текущему агенту..." -ForegroundColor Yellow
try {
    $service = Get-WmiObject Win32_Service -Filter "Name='1CUpdaterAgent'"
    $exePath = $service.PathName.Replace('"', '').Split()[0]
    Write-Host "✅ Текущий путь: $exePath" -ForegroundColor Green
    
    # Создаем резервную копию
    $backupPath = "$exePath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host ""
    Write-Host "Создание резервной копии..." -ForegroundColor Yellow
    Copy-Item -Path $exePath -Destination $backupPath -Force
    Write-Host "✅ Резервная копия: $backupPath" -ForegroundColor Green
    
    # Копируем новый агент
    Write-Host ""
    Write-Host "Копирование нового агента..." -ForegroundColor Yellow
    Copy-Item -Path $newAgentPath -Destination $exePath -Force
    Write-Host "✅ Агент обновлен!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ ОШИБКА: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Проверяем конфигурацию
Write-Host ""
Write-Host "Проверка конфигурации..." -ForegroundColor Yellow
$configPath = "C:\ProgramData\1CUpdaterAgent\config.json"
if (Test-Path $configPath) {
    $config = Get-Content $configPath | ConvertFrom-Json
    Write-Host "✅ Конфигурация найдена:" -ForegroundColor Green
    Write-Host "   PcId: $($config.PcId)" -ForegroundColor White
    Write-Host "   ServerUrl: $($config.ServerUrl)" -ForegroundColor White
    Write-Host "   AgentId: $($config.AgentId)" -ForegroundColor White
    
    if ($config.PcId -eq 0) {
        Write-Host ""
        Write-Host "⚠️ ВНИМАНИЕ: PcId = 0! Агент не будет работать!" -ForegroundColor Red
        Write-Host "   Установите правильный PcId в config.json" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Конфигурация не найдена: $configPath" -ForegroundColor Yellow
    Write-Host "   Агент будет использовать значения по умолчанию" -ForegroundColor Gray
}

# Запускаем службу
Write-Host ""
Write-Host "Запуск службы..." -ForegroundColor Yellow
try {
    Start-Service -Name "1CUpdaterAgent"
    Start-Sleep -Seconds 3
    
    $service = Get-Service -Name "1CUpdaterAgent"
    if ($service.Status -eq 'Running') {
        Write-Host "✅ Служба запущена успешно!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Служба не запустилась. Статус: $($service.Status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ ОШИБКА при запуске службы: $($_.Exception.Message)" -ForegroundColor Red
}

# Ждем и проверяем EventLog
Write-Host ""
Write-Host "Ожидание 10 секунд для инициализации..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "=== Последние записи EventLog ===" -ForegroundColor Cyan
try {
    $events = Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 20 -ErrorAction SilentlyContinue
    if ($events) {
        $events | Format-List TimeGenerated, EntryType, Message
    } else {
        Write-Host "⚠️ Нет записей в EventLog от 1CUpdaterAgent" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Не удалось прочитать EventLog: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Проверяем ошибки приложения
Write-Host ""
Write-Host "=== Проверка ошибок приложения ===" -ForegroundColor Cyan
try {
    $errors = Get-EventLog -LogName Application -Source "Application Error" -Newest 5 -ErrorAction SilentlyContinue | 
        Where-Object { $_.Message -like "*1CUpdaterAgent*" }
    if ($errors) {
        Write-Host "❌ Найдены ошибки приложения:" -ForegroundColor Red
        $errors | Format-List TimeGenerated, EntryType, Message
    } else {
        Write-Host "✅ Ошибок приложения не найдено" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Не удалось проверить ошибки: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Обновление завершено ===" -ForegroundColor Cyan

