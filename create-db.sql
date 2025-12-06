-- SQL скрипт для создания базы данных

-- Создание базы данных
CREATE DATABASE "1c_updater"
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'Russian_Russia.1251'
    LC_CTYPE = 'Russian_Russia.1251'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Комментарий к базе данных
COMMENT ON DATABASE "1c_updater"
    IS 'База данных системы удаленного обновления 1С';




