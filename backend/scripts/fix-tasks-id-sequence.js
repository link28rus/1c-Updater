const { Client } = require('pg');
require('dotenv').config();

async function fixTasksIdSequence() {
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

    // Проверяем текущую структуру таблицы tasks
    const tableInfo = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      AND column_name = 'id';
    `);

    if (tableInfo.rows.length === 0) {
      console.log('❌ Table "tasks" does not exist');
      await client.end();
      return;
    }

    const idColumn = tableInfo.rows[0];
    console.log('Текущая структура столбца id:', idColumn);

    // Проверяем, есть ли последовательность
    const sequenceCheck = await client.query(`
      SELECT 
        pg_get_serial_sequence('tasks', 'id') as sequence_name;
    `);

    console.log('Последовательность для id:', sequenceCheck.rows[0]?.sequence_name || 'НЕ НАЙДЕНА');

    if (!sequenceCheck.rows[0]?.sequence_name) {
      console.log('⚠️ Последовательность не найдена. Исправляем...');

      // Удаляем существующий столбец id (если он не SERIAL)
      await client.query(`
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
      `);
      console.log('✅ Удалено ограничение PRIMARY KEY');

      // Пересоздаем столбец id как SERIAL
      await client.query(`
        ALTER TABLE tasks DROP COLUMN IF EXISTS id;
      `);
      console.log('✅ Удален старый столбец id');

      await client.query(`
        ALTER TABLE tasks ADD COLUMN id SERIAL PRIMARY KEY;
      `);
      console.log('✅ Создан новый столбец id с SERIAL');

      // Устанавливаем правильное значение последовательности
      const maxId = await client.query(`
        SELECT COALESCE(MAX(id), 0) as max_id FROM tasks;
      `);
      const nextId = parseInt(maxId.rows[0].max_id) + 1;
      
      await client.query(`
        SELECT setval(pg_get_serial_sequence('tasks', 'id'), $1, false);
      `, [nextId]);
      console.log(`✅ Последовательность установлена на ${nextId}`);
    } else {
      console.log('✅ Последовательность уже существует');
      
      // Проверяем, что она правильно настроена
      const sequenceName = sequenceCheck.rows[0].sequence_name;
      const sequenceInfo = await client.query(`
        SELECT last_value, is_called FROM ${sequenceName};
      `);
      console.log('Информация о последовательности:', sequenceInfo.rows[0]);
    }

    // Проверяем результат
    const finalCheck = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      AND column_name = 'id';
    `);
    console.log('✅ Финальная структура столбца id:', finalCheck.rows[0]);

    console.log('\n✅ Миграция завершена успешно!');
    await client.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

fixTasksIdSequence();

