# Руководство по установке агента

## Проблема: "Агент не устанавливается"

Если агент не устанавливается, следуйте этой инструкции.

## Шаг 1: Подготовка файлов

### Вариант A: Использование готового exe файла (рекомендуется)

1. **Скачайте скрипт установки** из веб-интерфейса для нужного ПК
2. **Скопируйте файл `1CUpdaterAgent.exe`** из папки `agent/bin/Release/net8.0/` 
3. **Поместите оба файла в одну папку** на целевом ПК:
   ```
   C:\AgentInstall\
   ├── install-agent-pc1.ps1
   └── 1CUpdaterAgent.exe
   ```

### Вариант B: Использование структуры проекта

Если вы копируете всю папку `agent`, структура должна быть:
```
C:\AgentInstall\
├── install-agent-pc1.ps1
└── bin\
    └── Release\
        └── net8.0\
            └── 1CUpdaterAgent.exe
```

## Шаг 2: Запуск установки

1. **Откройте PowerShell от имени администратора**
   - Нажмите Win+X
   - Выберите "Windows PowerShell (Администратор)" или "Терминал (Администратор)"

2. **Перейдите в папку со скриптом:**
   ```powershell
   cd C:\AgentInstall
   ```

3. **Разрешите выполнение скрипта (если нужно):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
   ```

4. **Запустите скрипт:**
   ```powershell
   .\install-agent-pc1.ps1
   ```

## Шаг 3: Проверка установки

### Проверка статуса сервиса:
```powershell
Get-Service -Name "1CUpdaterAgent"
```

Статус должен быть `Running`.

### Проверка логов:
```powershell
Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 20
```

### Проверка конфигурации:
```powershell
Get-Content "C:\ProgramData\1CUpdaterAgent\config.json" | ConvertFrom-Json
```

## Типичные проблемы и решения

### Проблема 1: "Файл 1CUpdaterAgent.exe не найден"

**Причина:** Exe файл не находится в нужной папке.

**Решение:**
1. Убедитесь, что файл `1CUpdaterAgent.exe` находится в той же папке, что и скрипт
2. Или укажите полный путь к exe при запуске:
   ```powershell
   .\install-agent-pc1.ps1 -ExePath "C:\Path\To\1CUpdaterAgent.exe"
   ```

### Проблема 2: "Скрипт должен быть запущен от имени администратора"

**Причина:** Недостаточно прав для создания Windows Service.

**Решение:**
1. Закройте текущее окно PowerShell
2. Откройте PowerShell от имени администратора (правой кнопкой → "Запуск от имени администратора")
3. Повторите установку

### Проблема 3: "Не удалось создать сервис"

**Причины:**
- Файл заблокирован антивирусом
- Недостаточно прав
- Файл поврежден

**Решение:**
1. Проверьте, не блокирует ли антивирус файл
2. Добавьте исключение для папки с агентом
3. Убедитесь, что файл не поврежден (проверьте размер - должен быть ~148 KB)
4. Попробуйте запустить exe файл вручную для проверки:
   ```powershell
   .\1CUpdaterAgent.exe
   ```

### Проблема 4: "Сервис создан, но не запущен"

**Причина:** Ошибка при запуске сервиса.

**Решение:**
1. Проверьте логи:
   ```powershell
   Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 10
   ```

2. Проверьте конфигурацию:
   ```powershell
   Get-Content "C:\ProgramData\1CUpdaterAgent\config.json"
   ```

3. Убедитесь, что URL сервера правильный и доступен:
   ```powershell
   Test-NetConnection -ComputerName "192.168.25.200" -Port 3001
   ```

4. Попробуйте запустить вручную:
   ```powershell
   Start-Service -Name "1CUpdaterAgent"
   ```

### Проблема 5: "ExecutionPolicy запрещает выполнение скрипта"

**Решение:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Или для текущей сессии:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### Проблема 6: Агент не регистрируется на сервере

**Причины:**
- Неправильный URL сервера
- Файрвол блокирует соединение
- Сервер недоступен

**Решение:**
1. Проверьте URL в конфигурации:
   ```powershell
   (Get-Content "C:\ProgramData\1CUpdaterAgent\config.json" | ConvertFrom-Json).ServerUrl
   ```

2. Проверьте доступность сервера:
   ```powershell
   Invoke-WebRequest -Uri "http://192.168.25.200:3001/api/agent/status" -UseBasicParsing
   ```

3. Проверьте файрвол:
   ```powershell
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*1C*"}
   ```

4. Убедитесь, что бэкенд запущен и доступен

## Автоматическая проверка

Используйте скрипт проверки:
```powershell
.\check-agent.ps1
```

Он проверит:
- Статус сервиса
- Конфигурацию
- Подключение к серверу
- Логи

## Удаление агента

Если нужно удалить агент:
```powershell
Stop-Service -Name "1CUpdaterAgent" -Force
sc.exe delete "1CUpdaterAgent"
Remove-Item "C:\ProgramData\1CUpdaterAgent" -Recurse -Force
```

## Получение помощи

Если проблема не решена:
1. Проверьте логи: `Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 50`
2. Проверьте конфигурацию: `Get-Content "C:\ProgramData\1CUpdaterAgent\config.json"`
3. Проверьте статус сервиса: `Get-Service -Name "1CUpdaterAgent"`
4. Проверьте доступность сервера из веб-интерфейса


