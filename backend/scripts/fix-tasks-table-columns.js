const { Client } = require('pg');
require('dotenv').config();

async function fixTasksTableColumns() {
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

    // Получаем список всех столбцов
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      ORDER BY ordinal_position;
    `);

    console.log('\nТекущие столбцы таблицы tasks:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default || 'нет'}`);
    });

    // Проверяем наличие лишних столбцов
    const expectedColumns = ['id', 'name', 'description', 'distributionId', 'status', 'createdAt', 'updatedAt'];
    const existingColumns = columns.rows.map(c => c.column_name);
    
    const extraColumns = existingColumns.filter(col => !expectedColumns.includes(col));
    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));

    console.log('\nЛишние столбцы:', extraColumns.length > 0 ? extraColumns : 'нет');
    console.log('Отсутствующие столбцы:', missingColumns.length > 0 ? missingColumns : 'нет');

    // Удаляем лишние столбцы
    for (const col of extraColumns) {
      console.log(`\nУдаление столбца ${col}...`);
      try {
        await client.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS "${col}" CASCADE;`);
        console.log(`✅ Столбец ${col} удален`);
      } catch (error) {
        console.error(`❌ Ошибка при удалении столбца ${col}:`, error.message);
      }
    }

    // Проверяем, что все нужные столбцы есть
    const finalCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      ORDER BY ordinal_position;
    `);

    console.log('\n✅ Финальная структура таблицы tasks:');
    finalCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default || 'нет'}`);
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

fixTasksTableColumns();

