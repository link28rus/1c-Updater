const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config();

async function waitForTables(maxAttempts = 30) {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || '1c_updater',
  });

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await client.connect();
      
      // Проверяем существование таблицы users
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      await client.end();
      
      if (result.rows[0].exists) {
        return true;
      }
      
      console.log(`Waiting for tables... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      await client.end().catch(() => {});
      console.log(`Waiting for database connection... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return false;
}

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  console.log('Waiting for backend to create tables...');
  const tablesReady = await waitForTables();
  
  if (!tablesReady) {
    console.error('Tables were not created. Please check backend logs.');
    process.exit(1);
  }

  console.log('Tables found! Creating admin user...');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || '1c_updater',
  });

  try {
    await client.connect();

    // Проверяем, существует ли пользователь
    const checkResult = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (checkResult.rows.length > 0) {
      console.log(`User '${username}' already exists!`);
      await client.end();
      return;
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    await client.query(
      `INSERT INTO users (username, password, "isAdmin", "isBlocked", "createdAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [username, hashedPassword, true, false]
    );

    console.log(`\n✅ SUCCESS: Admin user created!`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`\n🌐 You can now login at http://localhost:5173`);

    await client.end();
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();




