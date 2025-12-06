const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config();

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

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

    console.log(`SUCCESS: Admin user '${username}' created!`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('\nYou can now login at http://localhost:5173');

    await client.end();
  } catch (error) {
    if (error.code === '42P01') {
      console.log('Users table does not exist yet.');
      console.log('Starting backend server will create the tables automatically.');
      console.log('Then run this script again.');
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

createAdmin();




