const { Client } = require('pg');
require('dotenv').config();

async function fixAllTables() {
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

    // Исправляем таблицу tasks
    const tasksNameCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'name';
    `);

    if (tasksNameCheck.rows.length > 0) {
      const nullCheck = await client.query(`
        SELECT COUNT(*) as count 
        FROM tasks 
        WHERE name IS NULL;
      `);
      
      if (parseInt(nullCheck.rows[0].count) > 0) {
        await client.query(`
          UPDATE tasks 
          SET name = 'Task ' || id::text 
          WHERE name IS NULL;
        `);
        console.log('✅ Fixed tasks.name column');
      }
    }

    // Исправляем таблицу distributions
    const distCheck = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'distributions' 
      AND column_name = 'filename';
    `);

    if (distCheck.rows.length > 0) {
      const nullCheck = await client.query(`
        SELECT COUNT(*) as count 
        FROM distributions 
        WHERE filename IS NULL;
      `);
      
      if (parseInt(nullCheck.rows[0].count) > 0) {
        // Обновляем NULL значения
        await client.query(`
          UPDATE distributions 
          SET filename = 'file_' || id::text || '.msi' 
          WHERE filename IS NULL;
        `);
        console.log('✅ Fixed distributions.filename column');
      }

      // Если колонка nullable, делаем её NOT NULL
      if (distCheck.rows[0].is_nullable === 'YES') {
        try {
          await client.query(`
            ALTER TABLE distributions 
            ALTER COLUMN filename SET NOT NULL;
          `);
          console.log('✅ Set distributions.filename to NOT NULL');
        } catch (e) {
          console.log('⚠️  Could not set NOT NULL (might already be set)');
        }
      }
    }

    // Проверяем другие потенциальные проблемы
    const tables = ['users', 'groups', 'pcs', 'distributions', 'tasks'];
    for (const table of tables) {
      const result = await client.query(`
        SELECT COUNT(*) as count 
        FROM ${table};
      `);
      console.log(`  ${table}: ${result.rows[0].count} records`);
    }

    await client.end();
    console.log('\n✅ All tables fixed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixAllTables();




