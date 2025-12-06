#!/bin/bash

# Скрипт установки для Linux/Mac

echo "=== Установка системы обновления 1С ==="

# Проверка Node.js
echo ""
echo "Проверка Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "Node.js установлен: $NODE_VERSION"
else
    echo "ОШИБКА: Node.js не установлен!"
    echo "Установите Node.js с https://nodejs.org/"
    exit 1
fi

# Проверка PostgreSQL
echo ""
echo "Проверка PostgreSQL..."
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version)
    echo "PostgreSQL найден: $PG_VERSION"
else
    echo "ПРЕДУПРЕЖДЕНИЕ: PostgreSQL не найден в PATH"
    echo "Убедитесь, что PostgreSQL установлен и база данных создана"
fi

# Установка зависимостей Backend
echo ""
echo "Установка зависимостей Backend..."
cd backend
if [ -d "node_modules" ]; then
    echo "Зависимости уже установлены, пропускаем..."
else
    npm install
    if [ $? -ne 0 ]; then
        echo "ОШИБКА при установке зависимостей Backend!"
        cd ..
        exit 1
    fi
fi
cd ..

# Установка зависимостей Frontend
echo ""
echo "Установка зависимостей Frontend..."
cd frontend
if [ -d "node_modules" ]; then
    echo "Зависимости уже установлены, пропускаем..."
else
    npm install
    if [ $? -ne 0 ]; then
        echo "ОШИБКА при установке зависимостей Frontend!"
        cd ..
        exit 1
    fi
fi
cd ..

# Создание директорий
echo ""
echo "Создание необходимых директорий..."
mkdir -p backend/uploads/distributions
echo "Директории созданы"

# Проверка .env файла
echo ""
echo "Проверка конфигурации..."
if [ -f "backend/.env" ]; then
    echo "Файл .env найден"
else
    echo "Файл .env не найден, создан из шаблона"
    cp backend/.env.example backend/.env 2>/dev/null || true
    echo "ВАЖНО: Отредактируйте backend/.env и укажите правильные настройки БД!"
fi

echo ""
echo "=== Установка завершена! ==="
echo ""
echo "Следующие шаги:"
echo "1. Настройте backend/.env файл"
echo "2. Создайте базу данных PostgreSQL: CREATE DATABASE 1c_updater;"
echo "3. Запустите Backend: npm run start:backend"
echo "4. Запустите Frontend: npm run start:frontend"
echo "5. Создайте первого пользователя: node backend/scripts/create-admin.js"




