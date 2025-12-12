# Скрипт для проверки логов агента 1CUpdaterAgent в EventLog

Write-Host "=== Логи агента 1CUpdaterAgent (последние 20 записей) ===" -ForegroundColor Cyan
Write-Host ""

try {
    $logs = Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 20 -ErrorAction Stop
    
    if ($logs.Count -eq 0) {
        Write-Host "⚠️ Логи не найдены. Убедитесь, что агент запущен." -ForegroundColor Yellow
    } else {
        $logs | Format-Table -Property TimeGenerated, EntryType, Message -AutoSize -Wrap
        
        Write-Host ""
        Write-Host "=== Статистика ===" -ForegroundColor Cyan
        $infoCount = ($logs | Where-Object { $_.EntryType -eq "Information" }).Count
        $warningCount = ($logs | Where-Object { $_.EntryType -eq "Warning" }).Count
        $errorCount = ($logs | Where-Object { $_.EntryType -eq "Error" }).Count
        
        Write-Host "Information: $infoCount" -ForegroundColor Green
        Write-Host "Warning: $warningCount" -ForegroundColor Yellow
        Write-Host "Error: $errorCount" -ForegroundColor Red
        
        Write-Host ""
        Write-Host "=== Последние записи о версии 1С ===" -ForegroundColor Cyan
        $oneCLogs = $logs | Where-Object { $_.Message -match "1С|1C|version|Version|версия" } | Select-Object -First 5
        if ($oneCLogs) {
            $oneCLogs | Format-Table -Property TimeGenerated, EntryType, Message -AutoSize -Wrap
        } else {
            Write-Host "Записи о версии 1С не найдены" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Ошибка при чтении логов: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Возможно, источник '1CUpdaterAgent' еще не создан." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Команда для мониторинга в реальном времени ===" -ForegroundColor Cyan
Write-Host "Get-EventLog -LogName Application -Source '1CUpdaterAgent' -Newest 1 | Format-List" -ForegroundColor Gray

