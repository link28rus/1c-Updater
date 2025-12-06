const { Client } = require('pg');
require('dotenv').config();

async function fixTasksTable() {
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

    // Проверяем, существует ли таблица tasks
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Tasks table does not exist, will be created by TypeORM');
      await client.end();
      return;
    }

    // Проверяем, есть ли колонка name
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'name';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('Adding name column to tasks table...');
      
      // Сначала добавляем колонку как nullable
      await client.query(`
        ALTER TABLE tasks 
        ADD COLUMN name VARCHAR;
      `);
      console.log('✅ Name column added (nullable)');

      // Обновляем существующие записи
      const updateResult = await client.query(`
        UPDATE tasks 
        SET name = 'Task ' || id::text 
        WHERE name IS NULL;
      `);
      console.log(`✅ Updated ${updateResult.rowCount} records`);

      // Теперь делаем колонку NOT NULL
      await client.query(`
        ALTER TABLE tasks 
        ALTER COLUMN name SET NOT NULL;
      `);
      console.log('✅ Name column set to NOT NULL');
    } else {
      console.log('Name column already exists');
    }

    // Проверяем и исправляем другие проблемы
    const tasksCheck = await client.query('SELECT COUNT(*) FROM tasks');
    console.log(`Tasks in database: ${tasksCheck.rows[0].count}`);

    await client.end();
    console.log('\n✅ Tasks table fixed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixTasksTable();




