# Инструкции по сборке установщика

## Обычная версия (требует .NET 8.0 Runtime)

```powershell
cd installer
dotnet build -c Release
```

Результат: `bin/Release/net8.0-windows/1CUpdaterAgentInstaller.exe`

**Требования:** На целевом ПК должен быть установлен .NET 8.0 Desktop Runtime

## Self-contained версия (не требует .NET Runtime)

```powershell
cd installer
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true
```

Результат: `bin/Release/net8.0-windows/win-x64/publish/1CUpdaterAgentInstaller.exe`

**Преимущества:**
- Не требует установки .NET Runtime на целевом ПК
- Все зависимости включены в один exe файл
- Больший размер файла (~70-100 MB)

**Рекомендуется:** Использовать self-contained версию для распространения

## Размеры файлов

- Обычная версия: ~150 KB (требует .NET Runtime)
- Self-contained версия: ~70-100 MB (не требует .NET Runtime)

## Какую версию использовать?

- **Self-contained:** Если на целевых ПК может не быть .NET Runtime
- **Обычная:** Если на всех целевых ПК гарантированно установлен .NET 8.0 Runtime


