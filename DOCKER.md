# Docker инструкции

## Быстрый старт с Docker Compose

### Production

```bash
docker-compose up -d
```

Это запустит:
- PostgreSQL базу данных
- Backend API на порту 3000
- Frontend на порту 5173

### Development

Для разработки используйте `docker-compose.dev.yml` только для PostgreSQL:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Затем запускайте backend и frontend локально:
```bash
npm run start:backend
npm run start:frontend
```

## Отдельная сборка образов

### Backend

```bash
cd backend
docker build -t 1c-updater-backend .
docker run -p 3000:3000 --env-file .env 1c-updater-backend
```

### Frontend

```bash
cd frontend
docker build -t 1c-updater-frontend .
docker run -p 80:80 1c-updater-frontend
```

## Переменные окружения для Docker

Создайте `.env` файл в корне проекта или используйте переменные окружения Docker Compose:

```env
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=1c_updater
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:5173
```

## Миграции БД

При первом запуске миграции применяются автоматически через команду в `docker-compose.yml`.

Для ручного применения:
```bash
docker-compose exec backend npm run migration:run
```

