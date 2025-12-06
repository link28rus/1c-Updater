const { Client } = require('pg');
require('dotenv').config();

async function fixTaskPcColumns() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || '1c_updater',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Проверяем текущие типы колонок
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'task_pc' 
      AND column_name IN ('taskId', 'pcId')
      ORDER BY column_name
    `);

    console.log('Current column types:');
    columns.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    // Исправляем тип колонок, если они TEXT
    for (const row of columns.rows) {
      if (row.data_type === 'text' || row.data_type === 'character varying') {
        console.log(`\nFixing ${row.column_name} from ${row.data_type} to INTEGER...`);
        
        // Сначала удаляем данные, которые не могут быть преобразованы в INTEGER
        await client.query(`
          DELETE FROM task_pc 
          WHERE "${row.column_name}" !~ '^[0-9]+$'
        `);
        
        // Преобразуем колонку в INTEGER
        await client.query(`
          ALTER TABLE task_pc 
          ALTER COLUMN "${row.column_name}" TYPE INTEGER 
          USING "${row.column_name}"::INTEGER
        `);
        
        console.log(`✅ Fixed ${row.column_name} to INTEGER`);
      }
    }

    // Проверяем результат
    const finalColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'task_pc' 
      AND column_name IN ('taskId', 'pcId')
      ORDER BY column_name
    `);

    console.log('\nFinal column types:');
    finalColumns.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Migration completed successfully!');
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixTaskPcColumns();



