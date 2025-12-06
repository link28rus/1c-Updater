const { Client } = require('pg');
require('dotenv').config();

async function addDescriptionColumns() {
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

    // Проверяем и добавляем description в tasks
    const tasksCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'description'
    `);

    if (tasksCheck.rows.length === 0) {
      console.log('Adding description column to tasks table...');
      await client.query(`
        ALTER TABLE tasks 
        ADD COLUMN description character varying
      `);
      console.log('✅ Added description column to tasks');
    } else {
      console.log('✅ tasks.description already exists');
    }

    // Проверяем и добавляем description в distributions
    const distributionsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'distributions' AND column_name = 'description'
    `);

    if (distributionsCheck.rows.length === 0) {
      console.log('Adding description column to distributions table...');
      await client.query(`
        ALTER TABLE distributions 
        ADD COLUMN description character varying
      `);
      console.log('✅ Added description column to distributions');
    } else {
      console.log('✅ distributions.description already exists');
    }

    console.log('\n✅ All description columns added successfully!');
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

addDescriptionColumns();



