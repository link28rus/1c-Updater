# Скрипт для проверки, как 1С записана в реестре Uninstall

Write-Host "=== Поиск 1С в реестре Uninstall ===" -ForegroundColor Cyan
Write-Host ""

$paths = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
)

$found = $false

foreach ($path in $paths) {
    Write-Host "Проверка: $path" -ForegroundColor Yellow
    
    try {
        $keys = Get-ChildItem -Path $path -ErrorAction SilentlyContinue
        
        foreach ($key in $keys) {
            try {
                $displayName = (Get-ItemProperty -Path $key.PSPath -Name DisplayName -ErrorAction SilentlyContinue).DisplayName
                $displayVersion = (Get-ItemProperty -Path $key.PSPath -Name DisplayVersion -ErrorAction SilentlyContinue).DisplayVersion
                
                if ($displayName -and (
                    $displayName -match "1C" -or 
                    $displayName -match "1С" -or
                    $displayName -match "Предприятие" -or
                    $displayName -match "Enterprise"
                )) {
                    $found = $true
                    Write-Host "  ✅ НАЙДЕНО:" -ForegroundColor Green
                    Write-Host "     DisplayName: $displayName" -ForegroundColor White
                    Write-Host "     DisplayVersion: $displayVersion" -ForegroundColor White
                    Write-Host "     Key: $($key.PSChildName)" -ForegroundColor Gray
                    Write-Host ""
                    
                    # Показываем все значения этого ключа
                    Write-Host "     Все значения ключа:" -ForegroundColor Cyan
                    $props = Get-ItemProperty -Path $key.PSPath -ErrorAction SilentlyContinue
                    $props.PSObject.Properties | Where-Object { 
                        $_.Name -notmatch "^PS" -and 
                        $_.Name -ne "Path" -and 
                        $_.Name -ne "PSPath" -and
                        $_.Name -ne "PSParentPath" -and
                        $_.Name -ne "PSChildName" -and
                        $_.Name -ne "PSDrive" -and
                        $_.Name -ne "PSProvider"
                    } | ForEach-Object {
                        Write-Host "       $($_.Name) = $($_.Value)" -ForegroundColor Gray
                    }
                    Write-Host ""
                }
            } catch {
                # Игнорируем ошибки чтения отдельных ключей
            }
        }
    } catch {
        Write-Host "  ❌ Ошибка доступа к $path : $($_.Exception.Message)" -ForegroundColor Red
    }
}

if (-not $found) {
    Write-Host "❌ 1С не найдена в реестре Uninstall" -ForegroundColor Red
    Write-Host ""
    Write-Host "Проверяем альтернативные пути..." -ForegroundColor Yellow
    
    # Проверяем другие возможные пути
    $altPaths = @(
        "HKLM:\SOFTWARE\1C",
        "HKLM:\SOFTWARE\WOW6432Node\1C",
        "HKLM:\SOFTWARE\1C\1Cv8",
        "HKLM:\SOFTWARE\WOW6432Node\1C\1Cv8"
    )
    
    foreach ($altPath in $altPaths) {
        if (Test-Path $altPath) {
            Write-Host "  ✅ Найден путь: $altPath" -ForegroundColor Green
            try {
                Get-ChildItem -Path $altPath -Recurse -ErrorAction SilentlyContinue | 
                    Select-Object -First 10 | 
                    ForEach-Object {
                        Write-Host "     $($_.PSPath)" -ForegroundColor Gray
                    }
            } catch {}
        }
    }
}

Write-Host ""
Write-Host "=== Проверка файловой системы ===" -ForegroundColor Cyan
$commonPaths = @(
    "C:\Program Files\1cv8",
    "C:\Program Files (x86)\1cv8",
    "D:\Program Files\1cv8"
)

foreach ($fsPath in $commonPaths) {
    if (Test-Path $fsPath) {
        Write-Host "  ✅ Найден путь: $fsPath" -ForegroundColor Green
        $versions = Get-ChildItem -Path $fsPath -Directory -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -match "^\d+\.\d+" } | 
            Select-Object -First 5
        if ($versions) {
            foreach ($ver in $versions) {
                Write-Host "     Версия: $($ver.Name)" -ForegroundColor Gray
            }
        }
    }
}

