const { Client } = require('pg');
require('dotenv').config();

async function fixTasksColumnTypes() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || '1c_updater',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Проверяем текущие типы
    const columns = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      AND column_name IN ('distributionId', 'status');
    `);

    console.log('\nТекущие типы столбцов:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

    // Исправляем тип distributionId (text -> integer)
    const distCol = columns.rows.find(c => c.column_name === 'distributionId');
    if (distCol && distCol.data_type === 'text') {
      console.log('\nИсправление типа distributionId (text -> integer)...');
      try {
        // Сначала удаляем внешний ключ, если есть
        await client.query(`
          ALTER TABLE tasks DROP CONSTRAINT IF EXISTS "tasks_distributionId_fkey";
        `);
        
        // Изменяем тип столбца
        await client.query(`
          ALTER TABLE tasks 
          ALTER COLUMN "distributionId" TYPE INTEGER 
          USING CASE 
            WHEN "distributionId" ~ '^[0-9]+$' THEN "distributionId"::INTEGER 
            ELSE NULL 
          END;
        `);
        console.log('✅ Тип distributionId изменен на integer');
      } catch (error) {
        console.error('❌ Ошибка при изменении типа distributionId:', error.message);
      }
    }

    // Исправляем тип status (text -> enum)
    const statusCol = columns.rows.find(c => c.column_name === 'status');
    if (statusCol && statusCol.data_type === 'text') {
      console.log('\nИсправление типа status (text -> enum)...');
      try {
        // Проверяем, существует ли enum тип
        const enumCheck = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = 'task_status'
          );
        `);

        if (!enumCheck.rows[0].exists) {
          // Создаем enum тип
          await client.query(`
            CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
          `);
          console.log('✅ Создан enum тип task_status');
        }

        // Изменяем тип столбца
        await client.query(`
          ALTER TABLE tasks 
          ALTER COLUMN status TYPE task_status 
          USING status::task_status;
        `);
        console.log('✅ Тип status изменен на task_status enum');
      } catch (error) {
        console.error('❌ Ошибка при изменении типа status:', error.message);
      }
    }

    // Проверяем результат
    const finalCheck = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      ORDER BY ordinal_position;
    `);

    console.log('\n✅ Финальная структура таблицы tasks:');
    finalCheck.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

    console.log('\n✅ Миграция завершена успешно!');
    await client.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

fixTasksColumnTypes();

