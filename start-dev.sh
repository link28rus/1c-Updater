#!/bin/bash

# Скрипт запуска для разработки (Linux/Mac)

echo "Запуск системы обновления 1С в режиме разработки..."

# Проверка .env
if [ ! -f "backend/.env" ]; then
    echo "ОШИБКА: Файл backend/.env не найден!"
    echo "Скопируйте backend/.env.example в backend/.env и настройте его"
    exit 1
fi

# Функция для остановки процессов при выходе
cleanup() {
    echo ""
    echo "Остановка серверов..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Запуск Backend
echo "Запуск Backend на http://localhost:3000..."
cd backend
npm run start:dev &
BACKEND_PID=$!
cd ..

# Небольшая задержка для запуска backend
sleep 3

# Запуск Frontend
echo "Запуск Frontend на http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Серверы запущены!"
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Нажмите Ctrl+C для остановки..."

# Ожидание
wait




