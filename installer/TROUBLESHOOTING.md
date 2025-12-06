# Решение проблем с установщиком

## Ошибка: "Параллельная конфигурация неправильна"

Эта ошибка возникает, когда Windows не может найти необходимые зависимости для приложения.

### Решение 1: Установка .NET 8.0 Runtime

Установщик требует .NET 8.0 Desktop Runtime. Скачайте и установите:

**Скачать:** https://dotnet.microsoft.com/download/dotnet/8.0

Выберите **.NET Desktop Runtime 8.0.x** для вашей системы (x64 или x86).

### Решение 2: Проверка установки .NET

Проверьте, установлен ли .NET 8.0:

```powershell
dotnet --list-runtimes
```

Должна быть строка вида:
```
Microsoft.WindowsDesktop.App 8.0.x
```

### Решение 3: Использование sxstrace для диагностики

Если ошибка сохраняется, используйте sxstrace для диагностики:

```powershell
# Запустите трассировку
sxstrace.exe Trace -logfile:sxstrace.etl

# Запустите установщик (в другом окне)

# Остановите трассировку (Ctrl+C)

# Преобразуйте лог
sxstrace.exe Parse -logfile:sxstrace.etl -outfile:sxstrace.txt
```

Проверьте файл `sxstrace.txt` для деталей ошибки.

### Решение 4: Альтернативный способ установки

Если установщик не работает, можно использовать PowerShell скрипт:

1. Скачайте скрипт установки из веб-интерфейса
2. Скачайте файл `1CUpdaterAgent.exe`
3. Запустите скрипт от имени администратора

### Решение 5: Проверка журнала событий

Проверьте журнал событий Windows:

```powershell
Get-EventLog -LogName Application -Newest 50 | Where-Object {$_.Source -like "*SideBySide*" -or $_.Message -like "*1CUpdaterAgentInstaller*"}
```

## Требования

- Windows 10/11 или Windows Server 2016+
- .NET 8.0 Desktop Runtime (x64)
- Права администратора

## Альтернатива: Self-contained версия

Если проблемы сохраняются, можно создать self-contained версию установщика, которая не требует установки .NET Runtime:

```powershell
cd installer
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

Результат будет в `bin/Release/net8.0-windows/win-x64/publish/1CUpdaterAgentInstaller.exe`


