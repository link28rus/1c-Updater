FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY src ./src

# Собираем приложение
RUN npm run build

# Production образ с nginx
FROM nginx:alpine

# Копируем собранное приложение
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

