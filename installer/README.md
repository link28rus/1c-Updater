# Windows Installer для 1C Updater

Полноценный Windows-установщик для системы удаленного обновления 1С, включающий все зависимости и автоматическую настройку.

## Возможности

- ✅ Автоматическая сборка всех компонентов (backend, frontend, agent)
- ✅ Автоматическая установка зависимостей:
  - PostgreSQL 14+ (автоматическая загрузка и установка)
  - .NET 8 Runtime (через Inno Setup prerequisites)
  - Node.js LTS (через Inno Setup prerequisites)
- ✅ Автоматическое создание базы данных PostgreSQL
- ✅ Автоматическая настройка конфигурации backend
- ✅ Установка Backend и Agent как Windows Services
- ✅ Полная деинсталляция с удалением служб

## Требования для сборки установщика

- Windows 10/11 или Windows Server 2016+
- PowerShell 5.1+
- Node.js 18+ и npm
- .NET 8 SDK
- Inno Setup 6.2+ (для компиляции .iss файла)

## Сборка установщика

### Шаг 1: Предварительная сборка компонентов

Запустите скрипт сборки всех компонентов:

```powershell
cd installer
.\build-installer.ps1
```

Скрипт выполнит:
1. Установку зависимостей backend и frontend (если нужно)
2. Сборку backend (`npm run build` → `backend/dist`)
3. Сборку frontend (`npm run build` → `frontend/dist`)
4. Публикацию agent как self-contained (`dotnet publish`)
5. Копирование всех артефактов в `installer/dist/`

**Результат:** Все компоненты будут собраны в папке `installer/dist/`

### Шаг 2: Компиляция установщика

Откройте файл `installer/server-installer.iss` в Inno Setup Compiler и нажмите "Compile" (или используйте командную строку):

```powershell
# Если Inno Setup установлен в стандартное место
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer\server-installer.iss
```

**Результат:** Будет создан файл `1c-Updater-Setup.exe` в корне проекта

## Использование установщика

### Установка

1. Запустите `1c-Updater-Setup.exe` от имени администратора
2. Следуйте инструкциям мастера установки
3. Выберите компоненты для установки (по умолчанию все)
4. Выберите задачи:
   - **Установить PostgreSQL** - автоматически установит PostgreSQL, если не установлен
   - **Создать базу данных автоматически** - создаст БД `1c_updater`
   - **Установить Backend как Windows Service** - зарегистрирует backend как службу
   - **Установить Agent как Windows Service** - зарегистрирует agent как службу

### После установки

Система будет установлена в `C:\Program Files\1c-Updater` со следующей структурой:

```
C:\Program Files\1c-Updater\
├── backend\
│   ├── dist\              # Собранный backend
│   ├── uploads\           # Папка для дистрибутивов
│   ├── .env               # Конфигурация (создается автоматически)
│   └── package.json
├── frontend\
│   └── dist\              # Собранный frontend
├── agent\
│   └── 1CUpdaterAgent.exe # Self-contained агент
└── scripts\
    ├── install-agent.ps1
    ├── setup-database.ps1
    ├── configure-backend.ps1
    └── ...
```

### Настройка

#### Backend

Конфигурация создается автоматически в `backend/.env`. По умолчанию:
- **Порт:** 3001
- **База данных:** localhost:5432, база `1c_updater`, пользователь `postgres`
- **JWT секрет:** генерируется автоматически

Для изменения настроек отредактируйте `backend/.env` и перезапустите службу:
```powershell
Restart-Service -Name "1CUpdaterBackend"
```

#### Agent

Конфигурация агента находится в `C:\ProgramData\1CUpdaterAgent\config.json`.

Для настройки агента на удаленном ПК:
1. Отредактируйте `config.json`:
   ```json
   {
     "ServerUrl": "http://your-server-ip:3001",
     "PcId": 1,
     "AgentId": "unique-id",
     "PollIntervalSeconds": 30,
     "HeartbeatIntervalSeconds": 60
   }
   ```
2. Перезапустите службу:
   ```powershell
   Restart-Service -Name "1CUpdaterAgent"
   ```

### Удаление

Запустите деинсталлятор через "Программы и компоненты" или:
```powershell
& "C:\Program Files\1c-Updater\uninstall.exe"
```

При удалении можно выбрать удаление Windows Services.

## Структура скриптов

### `build-installer.ps1`
Скрипт предварительной сборки всех компонентов проекта.

### `server-installer.iss`
Основной Inno Setup скрипт для создания установщика.

### `install-agent.ps1`
Скрипт установки агента как Windows Service.

### `scripts/install-postgresql.ps1`
Автоматическая установка PostgreSQL (скачивание и установка).

### `scripts/setup-database.ps1`
Создание базы данных PostgreSQL.

### `scripts/configure-backend.ps1`
Настройка конфигурации backend (.env файл).

### `scripts/install-backend-service.ps1`
Установка backend как Windows Service.

### `scripts/check-dependencies.ps1`
Проверка установленных зависимостей.

## Устранение неполадок

### PostgreSQL не устанавливается

Если автоматическая установка PostgreSQL не работает:
1. Установите PostgreSQL вручную с https://www.postgresql.org/download/windows/
2. Запустите установщик снова и пропустите установку PostgreSQL

### Backend Service не запускается

1. Проверьте логи службы:
   ```powershell
   Get-EventLog -LogName Application -Source "1CUpdaterBackend" -Newest 50
   ```
2. Проверьте конфигурацию в `backend/.env`
3. Убедитесь, что база данных создана и доступна

### Agent не подключается к серверу

1. Проверьте `config.json` в `C:\ProgramData\1CUpdaterAgent\`
2. Убедитесь, что `ServerUrl` правильный и доступен
3. Проверьте, что `PcId` соответствует ID ПК в веб-интерфейсе
4. Проверьте логи службы:
   ```powershell
   Get-EventLog -LogName Application -Source "1CUpdaterAgent" -Newest 50
   ```

## Разработка

### Добавление новых компонентов

1. Добавьте сборку компонента в `build-installer.ps1`
2. Добавьте файлы в секцию `[Files]` в `server-installer.iss`
3. При необходимости добавьте скрипты настройки

### Изменение зависимостей

Для изменения версий зависимостей отредактируйте секцию `[Prerequisites]` в `server-installer.iss`.

## Лицензия

См. основной файл LICENSE в корне проекта.
