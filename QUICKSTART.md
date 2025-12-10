# Быстрый старт

## 1. Установка зависимостей

```bash
# Установить все зависимости
npm run install:all
```

Или по отдельности:
```bash
cd backend && npm install
cd ../frontend && npm install
```

## 2. Настройка базы данных

1. Установите PostgreSQL
2. Создайте базу данных:
```sql
CREATE DATABASE 1c_updater;
```

## 3. Настройка Backend

1. Создайте файл `backend/.env` (см. `backend/.env.example` для примера):
```env
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
ENCRYPTION_SECRET=your-encryption-secret
```

2. Примените миграции базы данных:
```bash
cd backend
npm run migration:run
```

3. Запустите backend:
```bash
npm run start:backend
```

## 4. Создание первого пользователя

Выполните скрипт:
```bash
cd backend
node scripts/create-admin.js
```

Скопируйте сгенерированный SQL запрос и выполните его в PostgreSQL.

## 5. Запуск Frontend

```bash
npm run start:frontend
```

Откройте браузер: http://localhost:5173

## 6. Установка Agent на ПК

1. Соберите агент:
```bash
npm run build:agent
```

2. Скопируйте файлы из `agent/bin/Release/net8.0/` на целевой ПК

3. Создайте конфиг `C:\ProgramData\1CUpdaterAgent\config.json`:
```json
{
  "ServerUrl": "http://your-server-ip:3000",
  "PcId": 1,
  "AgentId": "unique-id",
  "PollIntervalSeconds": 30,
  "HeartbeatIntervalSeconds": 60
}
```

4. Установите как сервис:
```bash
sc create "1CUpdaterAgent" binPath="C:\path\to\1CUpdaterAgent.exe" start=auto
sc start "1CUpdaterAgent"
```

## Первые шаги в системе

1. Войдите в систему с созданным администратором
2. Создайте группу (например, "Организация 1")
3. Добавьте ПК с указанием IP и учетных данных
4. Загрузите дистрибутив 1С
5. Создайте задачу обновления для выбранных ПК

## Полезные команды

- `npm run start:backend` - запуск backend
- `npm run start:frontend` - запуск frontend
- `npm run build:backend` - сборка backend для production
- `npm run build:frontend` - сборка frontend для production
- `npm run build:agent` - сборка агента
- `cd backend && npm run migration:run` - применить миграции БД
- `cd backend && npm run migration:revert` - откатить последнюю миграцию




