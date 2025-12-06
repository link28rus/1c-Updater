const { Client } = require('pg');
require('dotenv').config();

async function fixDistributionsCreatedAt() {
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

    // Проверяем, существует ли колонка createdAt
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'distributions' AND column_name = 'createdAt'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Adding createdAt column to distributions table...');
      await client.query(`
        ALTER TABLE distributions 
        ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      `);
      console.log('✅ Added createdAt column to distributions');
    } else {
      console.log('✅ createdAt column already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixDistributionsCreatedAt();



