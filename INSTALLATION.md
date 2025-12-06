# Инструкция по установке системы обновления 1С

## Требования

### Сервер (Backend + Frontend)
- Node.js 18+ и npm
- PostgreSQL 14+
- Windows или Linux

### Агент (на каждом ПК)
- Windows 10/11 или Windows Server 2016+
- .NET 8 Runtime
- Права администратора

## Установка Backend

1. Перейдите в директорию backend:
```bash
cd backend
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=1c_updater
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=development
UPLOAD_DIR=./uploads/distributions
```

4. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE 1c_updater;
```

5. Запустите сервер:
```bash
npm run start:dev
```

База данных будет создана автоматически при первом запуске (в режиме development).

## Установка Frontend

1. Перейдите в директорию frontend:
```bash
cd frontend
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите dev сервер:
```bash
npm run dev
```

Frontend будет доступен по адресу: http://localhost:5173

## Установка Agent

1. Соберите проект:
```bash
cd agent
dotnet build -c Release
```

2. Скопируйте файлы из `bin/Release/net8.0/` на целевой ПК

3. Создайте конфигурационный файл `C:\ProgramData\1CUpdaterAgent\config.json`:
```json
{
  "ServerUrl": "http://your-server-ip:3000",
  "PcId": 1,
  "AgentId": "unique-agent-id",
  "PollIntervalSeconds": 30,
  "HeartbeatIntervalSeconds": 60
}
```

**Важно:** `PcId` должен соответствовать ID ПК, созданного в веб-интерфейсе.

4. Установите как Windows Service:
```bash
sc create "1CUpdaterAgent" binPath="C:\path\to\1CUpdaterAgent.exe" start=auto
sc start "1CUpdaterAgent"
```

## Первый запуск

1. Откройте веб-интерфейс: http://localhost:5173

2. Создайте первого пользователя через базу данных:
```sql
INSERT INTO users (username, password, "isAdmin", "isBlocked", "createdAt")
VALUES ('admin', '$2b$10$...', true, false, NOW());
```

Или используйте скрипт для создания пользователя (требуется bcrypt).

3. Войдите в систему и создайте:
   - Группы ПК (организации)
   - Карточки ПК с указанием IP и учетных данных
   - Загрузите дистрибутивы 1С
   - Создайте задачи обновления

## Настройка Agent на ПК

1. В веб-интерфейсе создайте карточку ПК с указанием:
   - Имя ПК
   - IP адрес
   - Имя пользователя администратора
   - Пароль администратора
   - Группа (опционально)

2. Запомните ID созданного ПК

3. На целевом ПК установите Agent и укажите в `config.json`:
   - `PcId` - ID из веб-интерфейса
   - `ServerUrl` - адрес сервера

4. Запустите Agent как Windows Service

5. Agent автоматически зарегистрируется на сервере

## Использование

1. **Загрузка дистрибутива:**
   - Перейдите в "Дистрибутивы"
   - Нажмите "Загрузить дистрибутив"
   - Выберите файл .msi или .exe
   - Версия и архитектура определятся автоматически из имени файла

2. **Создание задачи обновления:**
   - Перейдите в "Задачи"
   - Нажмите "Создать задачу"
   - Выберите дистрибутив
   - Выберите ПК или группу ПК
   - Создайте задачу

3. **Мониторинг:**
   - Статус задач отображается в реальном времени
   - ПК показывают статус онлайн/офлайн
   - Версия 1С обновляется автоматически после установки

## Устранение неполадок

### Agent не регистрируется
- Проверьте доступность сервера с ПК
- Проверьте правильность `PcId` в config.json
- Проверьте логи Windows Event Viewer

### Задачи не выполняются
- Убедитесь, что Agent запущен
- Проверьте права администратора
- Проверьте доступность дистрибутива на сервере

### Ошибки установки
- Проверьте логи Agent
- Убедитесь, что установщик 1С доступен
- Проверьте права на запуск установщика




