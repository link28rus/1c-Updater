# Система удаленного обновления 1С

Веб-приложение для удаленного управления обновлениями платформы 1С на множестве ПК.

## Архитектура

Проект состоит из трех компонентов:

- **Frontend** (React + TypeScript) - веб-интерфейс на русском языке
- **Backend** (NestJS + TypeScript) - REST API и бизнес-логика
- **Agent** (.NET 8 C#) - Windows Service для установки обновлений на ПК

## Требования

- Node.js 18+
- PostgreSQL 14+
- .NET 8 SDK (для агента)
- Windows (для агента)

## Установка

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Настройте .env файл
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Agent

```bash
cd agent
dotnet build
# Установите как Windows Service
```

## Использование

1. Запустите PostgreSQL
2. Запустите Backend API
3. Запустите Frontend
4. Установите Agent на целевые ПК
5. Откройте веб-интерфейс в браузере




