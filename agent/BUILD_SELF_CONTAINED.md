# Сборка self-contained версии агента

## Проблема

Обычная версия агента требует наличия `.dll` файлов рядом с `.exe`, что вызывает ошибку:
```
The application to execute does not exist: 'C:\Program Files\1CUpdaterAgent\1CUpdaterAgent.dll'
```

## Решение

Используйте self-contained версию агента, которая включает все зависимости в один `.exe` файл.

## Команда сборки

```powershell
cd agent
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true
```

## Результат

- **Путь:** `bin\Release\net8.0\win-x64\publish\1CUpdaterAgent.exe`
- **Размер:** ~35 MB (включает .NET Runtime)
- **Преимущества:**
  - Не требует установки .NET Runtime на целевом ПК
  - Все зависимости включены в один файл
  - Не требует наличия .dll файлов рядом

## Автоматическая сборка

Бэкенд автоматически отдает self-contained версию, если она доступна. Если нет - отдает обычную версию.

## Проверка

После сборки проверьте размер файла:
```powershell
Get-Item "bin\Release\net8.0\win-x64\publish\1CUpdaterAgent.exe" | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}
```

Self-contained версия должна быть ~35 MB, обычная - ~150 KB.


