const { Client } = require('pg');
require('dotenv').config();

async function fixTasksStatusEnum() {
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
    } else {
      console.log('✅ Enum тип task_status уже существует');
    }

    // Удаляем значение по умолчанию
    console.log('\nУдаление значения по умолчанию для status...');
    await client.query(`
      ALTER TABLE tasks ALTER COLUMN status DROP DEFAULT;
    `);
    console.log('✅ Значение по умолчанию удалено');

    // Изменяем тип столбца
    console.log('\nИзменение типа status (text -> task_status enum)...');
    await client.query(`
      ALTER TABLE tasks 
      ALTER COLUMN status TYPE task_status 
      USING CASE 
        WHEN status = 'pending' THEN 'pending'::task_status
        WHEN status = 'in_progress' THEN 'in_progress'::task_status
        WHEN status = 'completed' THEN 'completed'::task_status
        WHEN status = 'failed' THEN 'failed'::task_status
        WHEN status = 'cancelled' THEN 'cancelled'::task_status
        ELSE 'pending'::task_status
      END;
    `);
    console.log('✅ Тип status изменен на task_status enum');

    // Устанавливаем значение по умолчанию
    console.log('\nУстановка значения по умолчанию для status...');
    await client.query(`
      ALTER TABLE tasks 
      ALTER COLUMN status SET DEFAULT 'pending'::task_status;
    `);
    console.log('✅ Значение по умолчанию установлено');

    // Проверяем результат
    const finalCheck = await client.query(`
      SELECT column_name, data_type, udt_name, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      AND column_name = 'status';
    `);

    console.log('\n✅ Финальная структура столбца status:');
    finalCheck.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name}), default: ${col.column_default || 'нет'}`);
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

fixTasksStatusEnum();

