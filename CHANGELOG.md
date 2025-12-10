# Changelog

## [1.1.0] - 2024-12-10

### Добавлено
- Система миграций TypeORM для управления схемой БД
- Unit-тесты для критичных сервисов (AuthService, TasksService, PcsService)
- E2E тесты для основных API endpoints
- Модуль отчетов и статистики с dashboard
- Real-time уведомления через Socket.io
- Потоковая загрузка больших файлов в Agent
- Поддержка RAR архивов в Agent
- Таймауты для процессов установки
- Docker контейнеризация (Backend, Frontend, PostgreSQL)
- `.env.example` для упрощения настройки
- Документация по миграциям БД

### Улучшено
- Логирование в Agent (замена Debug.WriteLine на ILogger)
- Обработка ошибок в Agent
- Документация проекта (INSTALLATION.md, QUICKSTART.md, MIGRATIONS.md, DOCKER.md)
- Структура проекта и качество кода

### Изменено
- Отключен `synchronize` в TypeORM - используются миграции
- Обновлена документация по установке и настройке

## [1.0.0] - 2024-01-XX

### Добавлено
- Полная система удаленного обновления 1С
- Backend API на NestJS с PostgreSQL
- Frontend на React с Material-UI
- Windows Service Agent на .NET 8
- Аутентификация с JWT
- Управление пользователями
- Управление ПК и группами
- Загрузка дистрибутивов с автоматическим парсингом версии
- Система задач обновления
- Мониторинг статуса ПК
- Автоматическое определение версии 1С через WMI

### Технологии
- Backend: NestJS, TypeScript, PostgreSQL, TypeORM
- Frontend: React, TypeScript, Material-UI, React Query
- Agent: .NET 8, Windows Service, WMI




