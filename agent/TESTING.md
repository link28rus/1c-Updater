# Инструкция по проверке установки и работы агента

## Быстрая проверка

### 1. Проверка через PowerShell скрипт

Запустите скрипт проверки (от имени администратора для полной проверки):

```powershell
cd agent
.\check-agent.ps1
```

Скрипт проверит:
- ✅ Существование и статус Windows Service
- ✅ Наличие конфигурационного файла
- ✅ Подключение к серверу
- ✅ Логи сервиса
- ✅ Сетевые подключения

### 2. Проверка через веб-интерфейс

1. Откройте страницу **"Агенты"** в веб-интерфейсе:
   - `http://localhost:5173/agents`
   - или `http://192.168.25.200:5173/agents`

2. В таблице должны отображаться:
   - **ПК** - имя компьютера
   - **IP Адрес** - IP адрес ПК
   - **Статус агента** - "Активен" или "Неактивен"
   - **Hostname** - имя хоста
   - **Версия 1С** - установленная версия 1С
   - **Архитектура** - архитектура 1С (x86/x64)
   - **Последний heartbeat** - время последнего heartbeat

3. Если агент зарегистрирован и работает:
   - Статус будет "Активен"
   - Последний heartbeat будет обновляться каждую минуту
   - Будет доступна кнопка "Скачать скрипт" для установки на другие ПК

## Ручная проверка

### Проверка Windows Service

```powershell
# Проверить статус сервиса
Get-Service -Name "1CUpdaterAgent"

# Запустить сервис
Start-Service -Name "1CUpdaterAgent"

# Остановить сервис
Stop-Service -Name "1CUpdaterAgent"

# Перезапустить сервис
Restart-Service -Name "1CUpdaterAgent"
```

### Проверка конфигурации

Конфигурационный файл находится в:
```
C:\ProgramData\1CUpdaterAgent\config.json
```

Проверьте содержимое:

```powershell
Get-Content "C:\ProgramData\1CUpdaterAgent\config.json" | ConvertFrom-Json
```

Должны быть указаны:
- `ServerUrl` - URL сервера (например, `http://192.168.25.200:3001`)
- `PcId` - ID ПК из веб-интерфейса
- `AgentId` - уникальный идентификатор агента
- `PollIntervalSeconds` - интервал опроса задач (по умолчанию 30)
- `HeartbeatIntervalSeconds` - интервал heartbeat (по умолчанию 60)

### Проверка логов

```powershell
# Последние 50 записей
Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 50

# Только ошибки
Get-EventLog -LogName Application -Source "1CUpdaterAgent" -EntryType Error -Newest 20

# Только предупреждения
Get-EventLog -LogName Application -Source "1CUpdaterAgent" -EntryType Warning -Newest 20
```

### Проверка регистрации на сервере

Агент регистрируется автоматически при запуске через API:

```powershell
# Проверка регистрации (требует авторизации)
$token = "YOUR_JWT_TOKEN"
$headers = @{
    "Authorization" = "Bearer $token"
}
Invoke-RestMethod -Uri "http://localhost:3001/api/agent/status" -Headers $headers
```

Или через веб-интерфейс на странице `/agents`.

### Проверка heartbeat

Агент отправляет heartbeat каждые 60 секунд (по умолчанию). Проверьте в веб-интерфейсе:
- Поле "Последний heartbeat" должно обновляться каждую минуту
- Если heartbeat не обновляется более 2-3 минут, агент не работает

## Тестирование API напрямую

### 1. Регистрация агента (тест)

```powershell
$body = @{
    pcId = 1
    agentId = "test-agent-123"
    hostname = "TEST-PC"
    osVersion = "Windows 10"
    lastOneCVersion = "8.3.27.1786"
    oneCArchitecture = "x64"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/agent/register" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### 2. Отправка heartbeat (тест)

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/agent/heartbeat/test-agent-123" `
    -Method POST
```

### 3. Получение статуса всех агентов (требует авторизации)

```powershell
$token = "YOUR_JWT_TOKEN"
$headers = @{
    "Authorization" = "Bearer $token"
}
Invoke-RestMethod -Uri "http://localhost:3001/api/agent/status" `
    -Headers $headers
```

## Типичные проблемы и решения

### Проблема: Сервис не запускается

**Решение:**
1. Проверьте логи: `Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 20`
2. Убедитесь, что файл `1CUpdaterAgent.exe` существует
3. Проверьте права доступа к конфигурационному файлу
4. Убедитесь, что сервис запущен от имени администратора

### Проблема: Агент не регистрируется на сервере

**Решение:**
1. Проверьте `ServerUrl` в конфигурации
2. Убедитесь, что бэкенд запущен и доступен
3. Проверьте сетевое подключение между агентом и сервером
4. Проверьте, что `PcId` соответствует ID ПК в веб-интерфейсе
5. Проверьте логи агента на наличие ошибок

### Проблема: Heartbeat не отправляется

**Решение:**
1. Проверьте подключение к серверу
2. Проверьте логи агента
3. Убедитесь, что сервис работает: `Get-Service -Name "1CUpdaterAgent"`
4. Проверьте `HeartbeatIntervalSeconds` в конфигурации

### Проблема: Агент не виден в веб-интерфейсе

**Решение:**
1. Убедитесь, что агент зарегистрирован (проверьте логи)
2. Обновите страницу в браузере
3. Проверьте, что `PcId` в конфигурации соответствует ID ПК в базе данных
4. Проверьте таблицу `agent_registrations` в базе данных

## Проверка через базу данных

Если у вас есть доступ к PostgreSQL:

```sql
-- Проверка всех зарегистрированных агентов
SELECT * FROM agent_registrations;

-- Проверка активных агентов
SELECT * FROM agent_registrations WHERE "isActive" = true;

-- Проверка последних heartbeat
SELECT 
    ar.*,
    p."name" as pc_name,
    p."ipAddress"
FROM agent_registrations ar
LEFT JOIN pcs p ON ar."pcId" = p.id
ORDER BY ar."lastHeartbeat" DESC;
```

## Автоматическая проверка

Для автоматической проверки можно использовать скрипт `check-agent.ps1` в планировщике задач Windows или добавить в мониторинг.


