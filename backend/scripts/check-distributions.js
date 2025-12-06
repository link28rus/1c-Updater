const { Client } = require('pg');
require('dotenv').config();

async function checkDistributions() {
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

    // Проверяем тип колонки ID
    const colInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'distributions' AND column_name = 'id'
    `);
    console.log('ID column type:', colInfo.rows[0]?.data_type);

    // Получаем несколько записей
    const result = await client.query('SELECT id, filename, version FROM distributions LIMIT 5');
    console.log('\nDistributions in DB:');
    result.rows.forEach(r => {
      console.log(`  ID: ${r.id} (type: ${typeof r.id}), filename: ${r.filename}`);
    });

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkDistributions();



