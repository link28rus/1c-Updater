const { Client } = require('pg');
require('dotenv').config();

async function fixTasksUpdatedAt() {
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

    // Проверяем текущую структуру столбца updatedAt
    const columnInfo = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      AND column_name = 'updatedAt';
    `);

    console.log('\nТекущая структура столбца updatedAt:');
    if (columnInfo.rows.length > 0) {
      const col = columnInfo.rows[0];
      console.log(`  Тип: ${col.data_type}`);
      console.log(`  Nullable: ${col.is_nullable}`);
      console.log(`  Default: ${col.column_default || 'нет'}`);
    } else {
      console.log('  Столбец не найден!');
      await client.end();
      return;
    }

    // Исправляем столбец updatedAt
    console.log('\nИсправление столбца updatedAt...');
    
    // Сначала делаем столбец nullable (временно)
    await client.query(`
      ALTER TABLE tasks ALTER COLUMN "updatedAt" DROP NOT NULL;
    `);
    console.log('✅ Удалено ограничение NOT NULL');

    // Устанавливаем значение по умолчанию
    await client.query(`
      ALTER TABLE tasks 
      ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✅ Установлено значение по умолчанию CURRENT_TIMESTAMP');

    // Обновляем существующие записи, где updatedAt = NULL
    await client.query(`
      UPDATE tasks 
      SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
      WHERE "updatedAt" IS NULL;
    `);
    console.log('✅ Обновлены существующие записи с NULL');

    // Возвращаем ограничение NOT NULL
    await client.query(`
      ALTER TABLE tasks ALTER COLUMN "updatedAt" SET NOT NULL;
    `);
    console.log('✅ Возвращено ограничение NOT NULL');

    // Проверяем результат
    const finalCheck = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      AND column_name = 'updatedAt';
    `);

    console.log('\n✅ Финальная структура столбца updatedAt:');
    const finalCol = finalCheck.rows[0];
    console.log(`  Тип: ${finalCol.data_type}`);
    console.log(`  Nullable: ${finalCol.is_nullable}`);
    console.log(`  Default: ${finalCol.column_default || 'нет'}`);

    console.log('\n✅ Миграция завершена успешно!');
    await client.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

fixTasksUpdatedAt();

