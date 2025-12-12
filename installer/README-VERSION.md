# Управление версией установщика

## Автоматическое увеличение версии

При каждой пересборке установщика версия автоматически увеличивается.

### Файл версии
Версия хранится в файле `version.txt` в формате `X.Y.Z` (например, `1.0.0`).

### Увеличение версии

**Автоматически при сборке:**
```powershell
.\build-with-version.ps1 build    # Увеличивает build (1.0.0 -> 1.0.1)
.\build-with-version.ps1 minor   # Увеличивает minor (1.0.0 -> 1.1.0)
.\build-with-version.ps1 major   # Увеличивает major (1.0.0 -> 2.0.0)
.\build-with-version.ps1 none    # Не увеличивает версию
```

**Вручную:**
```powershell
.\increment-version.ps1 build
.\increment-version.ps1 minor
.\increment-version.ps1 major
```

### Где отображается версия

1. **В заголовке окна установщика**: "Установщик 1C Updater Agent v1.0.0"
2. **В заголовке формы**: "Установка 1C Updater Agent v1.0.0"
3. **В имени файла**: `1CUpdaterAgentInstaller-v1.0.0.exe`

### Обычная сборка

Если нужно собрать без увеличения версии:
```powershell
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:Version=$(Get-Content version.txt -Raw).Trim()
```

### Проверка версии

```powershell
Get-Content version.txt
```

