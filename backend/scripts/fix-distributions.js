const { Client } = require('pg');
require('dotenv').config();

async function fixDistributions() {
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

    // Проверяем текущее состояние
    const check = await client.query('SELECT id, filename FROM distributions');
    console.log('Current distributions:', check.rows);

    // Обновляем NULL значения
    const updateResult = await client.query(`
      UPDATE distributions 
      SET filename = COALESCE(filename, 'file_' || id::text || '.msi') 
      WHERE filename IS NULL;
    `);
    console.log(`✅ Updated ${updateResult.rowCount} records`);

    // Проверяем, можно ли сделать NOT NULL
    const nullCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM distributions 
      WHERE filename IS NULL;
    `);

    if (parseInt(nullCheck.rows[0].count) === 0) {
      // Делаем колонку NOT NULL
      await client.query(`
        ALTER TABLE distributions 
        ALTER COLUMN filename SET NOT NULL;
      `);
      console.log('✅ Set filename column to NOT NULL');
    } else {
      console.log('⚠️  Still have NULL values, cannot set NOT NULL');
    }

    await client.end();
    console.log('\n✅ Distributions table fixed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixDistributions();




