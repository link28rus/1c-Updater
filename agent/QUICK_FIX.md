# Быстрое решение: Агент не отображается в веб-интерфейсе

## Проверка за 2 минуты

### 1. Проверьте конфигурацию (30 секунд)
```powershell
Get-Content "C:\ProgramData\1CUpdaterAgent\config.json"
```

**Должно быть:**
- `PcId`: число, соответствующее ID ПК в веб-интерфейсе (например, 3)
- `ServerUrl`: правильный URL сервера (например, `http://192.168.25.200:3001`)

### 2. Проверьте EventLog (30 секунд)
```powershell
Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 10 | Select-Object TimeGenerated, EntryType, Message
```

**Ищите:**
- ✅ "Агент успешно зарегистрирован" - все хорошо
- ❌ "Ошибка регистрации" или "ОШИБКА: PcId не установлен" - проблема

### 3. Перезапустите службу (10 секунд)
```powershell
Restart-Service -Name "1CUpdaterAgent"
```

### 4. Подождите 1 минуту и обновите веб-интерфейс

## Если не помогло

Проверьте доступность сервера:
```powershell
Test-NetConnection -ComputerName 192.168.25.200 -Port 3001
```

Если недоступен - проверьте файрвол и сеть.

## Частая ошибка

**PcId = 0** - агент не знает, к какому ПК он относится.

**Решение:** Откройте `C:\ProgramData\1CUpdaterAgent\config.json` и убедитесь, что `PcId` правильный (должен совпадать с ID ПК в веб-интерфейсе).


